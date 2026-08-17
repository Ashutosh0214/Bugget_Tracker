from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from database import get_db
from schemas import (
    TransactionCreate,
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
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
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
    if not data.name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Name and amount are required"}
        )
    
    tx_date = data.date if data.date else datetime.now().strftime("%Y-%m-%d")
    tx_category = data.category if data.category else "General"
    tx_status = data.status if data.status else "Completed"
    
    if data.icon:
        tx_icon = data.icon
    else:
        tx_icon = "💸" if data.amount < 0 else "💰"
        
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        """INSERT INTO transactions (user_id, name, category, amount, date, status, icon) 
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, data.name.strip(), tx_category, data.amount, tx_date, tx_status, tx_icon)
    )
    conn.commit()
    tx_id = cursor.lastrowid
    
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    
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

@router.delete("/{tx_id}", response_model=DeleteResponse)
def delete_transaction(tx_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM transactions WHERE id = ? AND user_id = ?",
        (tx_id, user_id)
    )
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": "Transaction not found or unauthorized"}
        )
        
    cursor.execute(
        "DELETE FROM transactions WHERE id = ? AND user_id = ?",
        (tx_id, user_id)
    )
    conn.commit()
    conn.close()
    
    return {"message": "Transaction deleted successfully", "id": tx_id}
