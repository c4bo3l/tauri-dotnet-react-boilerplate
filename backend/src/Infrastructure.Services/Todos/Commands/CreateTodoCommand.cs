using Mediator;
using Infrastructure.Database;
using Infrastructure.Dtos.Todos;
using Infrastructure.Models;

namespace Infrastructure.Services.Todos.Commands;

public partial record CreateTodoCommand(string Title) : IRequest<TodoResponse>;

public class CreateTodoHandler(IAppDbContext db) : IRequestHandler<CreateTodoCommand, TodoResponse>
{
    public async ValueTask<TodoResponse> Handle(CreateTodoCommand request, CancellationToken ct)
    {
        var item = new TodoItem
        {
            Title = request.Title,
            CreatedAt = DateTime.UtcNow
        };

        db.TodoItems.Add(item);
        await db.SaveChangesAsync(ct);

        return new TodoResponse(item.Id, item.Title, item.IsCompleted, item.CreatedAt);
    }
}
