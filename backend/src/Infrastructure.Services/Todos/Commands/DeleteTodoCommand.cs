using Mediator;
using Infrastructure.Database;

namespace Infrastructure.Services.Todos.Commands;

public partial record DeleteTodoCommand(int Id) : IRequest<bool>;

public class DeleteTodoHandler(IAppDbContext db) : IRequestHandler<DeleteTodoCommand, bool>
{
    public async ValueTask<bool> Handle(DeleteTodoCommand request, CancellationToken ct)
    {
        var item = await db.TodoItems.FindAsync([request.Id], ct);
        if (item is null) return false;

        db.TodoItems.Remove(item);
        await db.SaveChangesAsync(ct);

        return true;
    }
}
