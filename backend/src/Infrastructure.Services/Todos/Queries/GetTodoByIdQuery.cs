using Mediator;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Database;
using Infrastructure.Dtos.Todos;

namespace Infrastructure.Services.Todos.Queries;

public partial record GetTodoByIdQuery(int Id) : IRequest<TodoResponse?>;

public class GetTodoByIdHandler(IAppDbContext db) : IRequestHandler<GetTodoByIdQuery, TodoResponse?>
{
    public async ValueTask<TodoResponse?> Handle(GetTodoByIdQuery request, CancellationToken ct)
    {
        var item = await db.TodoItems
            .Where(t => t.Id == request.Id)
            .Select(t => new TodoResponse(t.Id, t.Title, t.IsCompleted, t.CreatedAt))
            .FirstOrDefaultAsync(ct);

        return item;
    }
}
