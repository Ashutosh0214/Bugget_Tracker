"""Small, auditable conversational handlers backed only by verified account data."""
import re
from datetime import date, timedelta


def normalize_message(message):
    text = re.sub(r"\s+", " ", message.casefold()).strip()
    for typo, word in {"spnd": "spend", "spnt": "spent", "expences": "expenses",
                       "transctions": "transactions", "budjet": "budget", "yesturday": "yesterday",
                       "todai": "today", "incom": "income"}.items():
        text = re.sub(rf"\b{typo}\b", word, text)
    return text


def activity_context(transactions, today):
    def summarize(rows):
        expenses = [r for r in rows if float(r['amount']) < 0]
        biggest = max(expenses, key=lambda r: -float(r['amount']), default=None)
        categories = {}
        for row in expenses:
            categories[row['category']] = categories.get(row['category'], 0) - float(row['amount'])
        return {"count": len(rows), "expenses": round(sum(-float(r['amount']) for r in expenses), 2),
                "income": round(sum(float(r['amount']) for r in rows if float(r['amount']) > 0), 2),
                "categories": {key: round(value, 2) for key, value in categories.items()},
                "largest": {"name": biggest['name'], "amount": -float(biggest['amount'])} if biggest else None}
    days = {}
    for row in transactions:
        days.setdefault(str(row['date']), []).append(row)
    previous = today.replace(day=1) - timedelta(days=1)
    return {"days": {key: summarize(rows) for key, rows in days.items()},
            "last_month": summarize([r for r in transactions if str(r['date']).startswith(previous.strftime('%Y-%m-'))])}


def conversational_reply(text, context, history=None, conversation_context=None):
    money = lambda amount: f"₹{amount:,.2f}".replace('.00', '')
    name = context.get('first_name', '')
    if re.fullmatch(r"(?:hi|hello|hey|hii|hiya|yo|good morning|good evening)(?:\s+(?:buddy|there|spendzy|spendze))?[!?. ]*", text):
        return ("Hey again! What's on your mind?" if history else
                f"Hey{' ' + name if name else ''}! How's it going? Want to check your expenses or plan a budget?")
    if re.fullmatch(r"(?:how are (?:you|u)|how's it going|whats up|what's up)[!?. ]*", text):
        return "Doing well, thanks! Ready to help you keep your finances organized. What's on your mind?"
    if re.fullmatch(r"(?:thanks|thank you|thank u|thx|ty)[!?. ]*", text):
        return "You're welcome!"
    if re.search(r"(?:other (?:users?|accounts?|people)|another (?:user|account)|user[_ ]?id|someone else|system prompt|api key)", text):
        return "I can only help with the account you're signed in to. I can't access other users' records or share private credentials."

    activity = context.get('activity')
    if activity:
        today = date.fromisoformat(context['today'])
        explicit = re.search(r"\b\d{4}-\d{2}-\d{2}\b", text)
        selected = None
        label = None
        if explicit:
            try:
                selected = date.fromisoformat(explicit.group())
            except ValueError:
                return "That date isn't valid. Please use a date like YYYY-MM-DD."
            label = f"on {selected.isoformat()}"
        elif 'yesterday' in text:
            selected, label = today - timedelta(days=1), 'yesterday'
        elif 'today' in text:
            selected, label = today, 'today'
        elif re.search(r"\b(?:tomorrow|last week|this week|last year|next month)\b", text):
            return "I can check today, yesterday, this month, last month, or a specific date (YYYY-MM-DD). Which would you like?"
        activity_question = bool(re.search(r"(?:did i|have i|any|show|recorded|added).*(?:add|record|transaction|anything|expense)|(?:any|my) transactions", text))
        if selected and not re.search(r'spend|spent|expense|income|earn|transaction|add|record', text):
            previous = next((item['content'] for item in reversed(history or []) if item.get('role') == 'user'), '')
            previous = normalize_message(previous)
            if re.search(r'transaction|did i.*add', previous):
                activity_question = True
            elif re.search(r'spend|spent|expense|income|earn', previous):
                text += ' ' + ('income' if re.search(r'income|earn', previous) else 'spent')
        if selected:
            if selected > today:
                return "That date is in the future. Recorded activity isn't a prediction; choose today or an earlier date."
            summary = activity['days'].get(selected.isoformat(), {'count': 0, 'expenses': 0, 'income': 0})
        elif 'last month' in text and not re.search(r'compare|comparison|versus| vs ', text):
            summary, label = activity['last_month'], 'last month'
        else:
            summary = {'count': context['data_limits']['current_month_transaction_count'], **context['recorded']}
            label = 'this month'
        if activity_question:
            return (f"You haven't recorded any transactions {label} yet. Want to add one?" if not summary['count'] else
                    f"Yes — you've recorded {summary['count']} transaction{'s' if summary['count'] != 1 else ''} {label}: {money(summary['expenses'])} in expenses and {money(summary['income'])} in income.")
        if selected or label == 'last month':
            if 'budget' in text:
                return "Budget usage is tracked by month. Ask about this month's budgets, or ask for expenses on that date."
            if re.search(r'biggest|largest', text):
                largest = summary.get('largest')
                return (f"Your largest expense {label} was {largest['name']} at {money(largest['amount'])}." if largest else f"You haven't recorded any expenses {label} yet.")
            for category, amount in summary.get('categories', {}).items():
                if re.search(r'\b' + re.escape(category.casefold()) + r'\b', text):
                    return f"You've spent {money(amount)} on {category} {label}."
            if re.search(r'income|earn', text):
                return f"You've recorded {money(summary['income'])} in income {label}."
            if re.search(r'spend|spent|expense', text):
                return (f"You've spent {money(summary['expenses'])} {label}." if summary['expenses'] else
                        f"You haven't recorded any expenses {label} yet.")
            return "For that date, would you like to check expenses, income, or transaction activity?"
        if re.search(r'compare.*last month|month.*comparison|more than last month|less than last month', text):
            previous = activity['last_month']
            if not previous['count']:
                return "You haven't recorded any transactions last month, so I can't make a useful comparison yet."
            current, old = context['recorded']['expenses'], previous['expenses']
            change = f" That's {abs((current-old)/old*100):.1f}% {'more' if current > old else 'less'}." if old and current != old else ''
            return f"You've spent {money(current)} so far this month versus {money(old)} across all of last month.{change} This month is still in progress."

    if re.search(r'how (?:can|do|could) i save|saving (?:tips|advice)|improve.*(?:spending|habits)', text):
        top = context.get('top_category')
        if top and context.get('data_limits', {}).get('expense_transaction_count', 0) >= 3:
            return f"{top['name']} is your largest recorded expense category at {money(top['amount'])} this month. Review which purchases there were optional, then set a realistic weekly cap. Any savings depend on what you can actually cut."
        return "General suggestions: review subscriptions, plan purchases, and set a small weekly spending cap. I don't have enough recorded expenses to personalize a saving plan or say whether your target is realistic yet."
    if re.search(r'spend|spent|expense', text) and not re.search(r'what if|if i|forecast|will|project', text):
        for item in context.get('category_spending', []):
            if re.search(r'\b' + re.escape(item['name'].casefold()) + r'\b', text):
                return f"You've spent {money(item['amount'])} on {item['name']} this month."
    if re.search(r'budget', text) and not re.search(r'that category|there|what if|which category', text):
        budgets = context.get('budgets', [])
        # Category-specific and hypothetical questions remain with the existing handler.
        if any(re.search(r'\b' + re.escape(b['category'].casefold()) + r'\b', text) for b in budgets):
            return None
        if not budgets:
            return "You haven't set any budgets for this month yet. Add a category budget to track what's left."
        if re.search(r'left|remaining', text):
            return "\n".join(f"• {b['category']}: {money(b['remaining'])} left" + (f" ({money(b['spent'] - b['limit'])} over budget)" if b['spent'] > b['limit'] else '') for b in budgets)
        if re.search(r'exceed|over|check|status|how are', text):
            over = [b for b in budgets if b['spent'] > b['limit']]
            return ('\n'.join(f"• {b['category']}: {money(b['spent'] - b['limit'])} over budget" for b in over) if over else "Your recorded spending is within each of your budgets this month.")
    return None
