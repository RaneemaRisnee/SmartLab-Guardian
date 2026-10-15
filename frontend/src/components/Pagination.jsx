export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;

  return (
    <div className="pagination">
      <span>
        Page {page} of {pages} &middot; {total} total
      </span>
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Prev
      </button>
      <button className="btn btn-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
