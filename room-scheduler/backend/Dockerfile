FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["RoomScheduler.API/RoomScheduler.API.csproj", "RoomScheduler.API/"]
RUN dotnet restore "RoomScheduler.API/RoomScheduler.API.csproj"
COPY . .
WORKDIR "/src/RoomScheduler.API"
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "RoomScheduler.API.dll"]