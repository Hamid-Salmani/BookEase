# Build context: backend/
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Directory.Build.props BookEase.sln ./
COPY src/BookEase.Domain/*.csproj src/BookEase.Domain/
COPY src/BookEase.Application/*.csproj src/BookEase.Application/
COPY src/BookEase.Infrastructure/*.csproj src/BookEase.Infrastructure/
COPY src/BookEase.Api/*.csproj src/BookEase.Api/
RUN dotnet restore src/BookEase.Api/BookEase.Api.csproj
COPY src/ src/
RUN dotnet publish src/BookEase.Api/BookEase.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /data && chown -R $APP_UID /data
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__Default="Data Source=/data/bookease.db;Default Timeout=30"
VOLUME /data
EXPOSE 8080
USER $APP_UID
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD curl -fs http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "BookEase.Api.dll"]
