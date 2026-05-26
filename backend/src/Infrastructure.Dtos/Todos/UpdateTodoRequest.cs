namespace Infrastructure.Dtos.Todos;

public record UpdateTodoRequest(string? Title, bool? IsCompleted);
