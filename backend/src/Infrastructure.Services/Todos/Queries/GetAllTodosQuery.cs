using Mediator;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Database;
using Infrastructure.Dtos.Todos;

namespace Infrastructure.Services.Todos.Queries;

public partial record GetAllTodosQuery : IRequest<IEnumerable<TodoResponse>>;

public class GetAllTodosHandler(IAppDbContext db) : IRequestHandler<GetAllTodosQuery, IEnumerable<TodoResponse>>
{
    public async ValueTask<IEnumerable<TodoResponse>> Handle(GetAllTodosQuery request, CancellationToken ct)
    {
        return await db.TodoItems
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TodoResponse(t.Id, t.Title, t.IsCompleted, t.CreatedAt))
            .ToListAsync(ct);
    }
}
