using Mediator;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Database;
using Infrastructure.Dtos.Todos;

namespace Infrastructure.Services.Todos.Commands;

public partial record UpdateTodoCommand(int Id, string? Title, bool? IsCompleted) : IRequest<TodoResponse?>;

public class UpdateTodoHandler(IAppDbContext db) : IRequestHandler<UpdateTodoCommand, TodoResponse?>
{
    public async ValueTask<TodoResponse?> Handle(UpdateTodoCommand request, CancellationToken ct)
    {
        var item = await db.TodoItems.FindAsync([request.Id], ct);
        if (item is null) return null;

        if (request.Title is not null)
            item.Title = request.Title;

        if (request.IsCompleted.HasValue)
            item.IsCompleted = request.IsCompleted.Value;

        await db.SaveChangesAsync(ct);

        return new TodoResponse(item.Id, item.Title, item.IsCompleted, item.CreatedAt);
    }
}
