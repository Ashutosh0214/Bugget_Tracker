from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from database import db_connection
from schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionListResponse,
    TransactionOut,
    DeleteResponse
)
from auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])

@router.get("", response_model=TransactionListResponse)
def get_transactions(current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    with db_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC",
            (user_id,)
        ).fetchall()
    
    transactions = [
        TransactionOut(
            id=row["id"],
            user_id=row["user_id"],
            name=row["name"],
            category=row["category"],
            amount=row["amount"],
            date=row["date"],
            status=row["status"] or "Completed",
            icon=row["icon"] or "💸",
            created_at=str(row["created_at"]) if row["created_at"] else ""
        )
        for row in rows
    ]
    
    return {"transactions": transactions}

@router.post("", status_code=status.HTTP_201_CREATED, response_model=TransactionResponse)
def add_transaction(data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    tx_date = data.date.isoformat() if data.date else datetime.now().date().isoformat()
    tx_category = data.category
    tx_status = data.status
    
    if data.icon:
        tx_icon = data.icon
    else:
        tx_icon = "💸" if data.amount < 0 else "💰"
        
    with db_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO transactions (user_id, name, category, amount, date, status, icon)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, data.name, tx_category, data.amount, tx_date, tx_status, tx_icon)
        )
        tx_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id)
        ).fetchone()
    
    created_tx = TransactionOut(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        category=row["category"],
        amount=row["amount"],
        date=row["date"],
        status=row["status"] or "Completed",
        icon=row["icon"] or "💸",
        created_at=str(row["created_at"]) if row["created_at"] else ""
    )
    
    return {"transaction": created_tx}

@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("id")
    tx_date = data.date.isoformat() if data.date else datetime.now().date().isoformat()
    tx_icon = data.icon or ("💸" if data.amount < 0 else "💰")

    with db_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM transactions WHERE id = ? AND user_id = ?",
            (tx_id, user_id),
        ).fetchone()
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"message": "Transaction not found or unauthorized"},
            )

        conn.execute(
            """UPDATE transactions
               SET name = ?, category = ?, amount = ?, date = ?, status = ?, icon = ?
               WHERE id = ? AND user_id = ?""",
            (
                data.name,
                data.category,
                data.amount,
                tx_date,
                data.status,
                tx_icon,
                tx_id,
                user_id,
            ),
        )
        row = conn.execute(
            "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
            (tx_id, user_id),
        ).fetchone()

    return {
        "transaction": TransactionOut(
            id=row["id"],
            user_id=row["user_id"],
            name=row["name"],
            category=row["category"],
            amount=row["amount"],
            date=row["date"],
            status=row["status"] or "Completed",
            icon=row["icon"] or ("💸" if row["amount"] < 0 else "💰"),
            created_at=str(row["created_at"]) if row["created_at"] else "",
        )
    }

@router.delete("/{tx_id}", response_model=DeleteResponse)
def delete_transaction(tx_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    with db_connection() as conn:
        result = conn.execute(
            "DELETE FROM transactions WHERE id = ? AND user_id = ?",
            (tx_id, user_id)
        )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Transaction not found or unauthorized"}
        )
    
    return {"message": "Transaction deleted successfully", "id": tx_id}
