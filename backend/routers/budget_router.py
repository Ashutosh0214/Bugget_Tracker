import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query, status

from auth import get_current_user
from database import db_connection
from schemas import BudgetCreate, BudgetListResponse, BudgetOut, BudgetResponse, BudgetUpdate, DeleteResponse


router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

BUDGET_SELECT = """
    SELECT b.*,
           COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS spent
    FROM budgets b
    LEFT JOIN transactions t
      ON t.user_id = b.user_id
     AND lower(t.category) = lower(b.category)
     AND CAST(substr(t.date, 6, 2) AS INTEGER) = b.month
     AND CAST(substr(t.date, 1, 4) AS INTEGER) = b.year
"""


def _budget_from_row(row: sqlite3.Row) -> BudgetOut:
    return BudgetOut(
        id=row["id"], user_id=row["user_id"], category=row["category"],
        amount=row["amount"], month=row["month"], year=row["year"], spent=row["spent"],
        created_at=str(row["created_at"] or ""), updated_at=str(row["updated_at"] or ""),
    )


def _get_owned_budget(conn: sqlite3.Connection, budget_id: int, user_id: int) -> sqlite3.Row | None:
    return conn.execute(
        BUDGET_SELECT + " WHERE b.id = ? AND b.user_id = ? GROUP BY b.id",
        (budget_id, user_id),
    ).fetchone()


@router.get("", response_model=BudgetListResponse)
def get_budgets(
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2200),
    current_user: dict = Depends(get_current_user),
):
    clauses = ["b.user_id = ?"]
    params: list[int] = [current_user["id"]]
    if month is not None:
        clauses.append("b.month = ?")
        params.append(month)
    if year is not None:
        clauses.append("b.year = ?")
        params.append(year)
    with db_connection() as conn:
        rows = conn.execute(
            BUDGET_SELECT + f" WHERE {' AND '.join(clauses)} GROUP BY b.id ORDER BY b.category",
            params,
        ).fetchall()
    return {"budgets": [_budget_from_row(row) for row in rows]}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=BudgetResponse)
def create_budget(data: BudgetCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    try:
        with db_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)",
                (user_id, data.category, data.amount, data.month, data.year),
            )
            row = _get_owned_budget(conn, cursor.lastrowid, user_id)
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": f"A budget already exists for {data.category} this month."},
        )
    return {"budget": _budget_from_row(row)}


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(budget_id: int, data: BudgetUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    try:
        with db_connection() as conn:
            existing = conn.execute(
                "SELECT id FROM budgets WHERE id = ? AND user_id = ?", (budget_id, user_id)
            ).fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail={"message": "Budget not found or unauthorized"})
            conn.execute(
                """UPDATE budgets SET category = ?, amount = ?, month = ?, year = ?,
                   updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?""",
                (data.category, data.amount, data.month, data.year, budget_id, user_id),
            )
            row = _get_owned_budget(conn, budget_id, user_id)
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": f"A budget already exists for {data.category} this month."},
        )
    return {"budget": _budget_from_row(row)}


@router.delete("/{budget_id}", response_model=DeleteResponse)
def delete_budget(budget_id: int, current_user: dict = Depends(get_current_user)):
    with db_connection() as conn:
        result = conn.execute(
            "DELETE FROM budgets WHERE id = ? AND user_id = ?", (budget_id, current_user["id"])
        )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail={"message": "Budget not found or unauthorized"})
    return {"message": "Budget deleted successfully", "id": budget_id}
