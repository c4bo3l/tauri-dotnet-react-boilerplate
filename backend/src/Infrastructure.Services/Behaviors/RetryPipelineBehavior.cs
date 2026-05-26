using Mediator;
using Microsoft.Data.Sqlite;
using Polly;
using Polly.Retry;

namespace Infrastructure.Services.Behaviors;

public class RetryPipelineBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private static readonly ResiliencePipeline Pipeline = new ResiliencePipelineBuilder()
        .AddRetry(new RetryStrategyOptions
        {
            ShouldHandle = new PredicateBuilder()
                .Handle<SqliteException>(ex => ex.SqliteErrorCode is 5 or 6),
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(200),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,
        })
        .Build();

    public async ValueTask<TResponse> Handle(
        TRequest request,
        MessageHandlerDelegate<TRequest, TResponse> next,
        CancellationToken cancellationToken)
    {
        return await Pipeline.ExecuteAsync(
            async ct => await next(request, ct), cancellationToken);
    }
}
