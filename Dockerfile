FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /source
COPY src/SanJacintoVive.Web/SanJacintoVive.Web.csproj src/SanJacintoVive.Web/
RUN dotnet restore src/SanJacintoVive.Web/SanJacintoVive.Web.csproj
COPY src/SanJacintoVive.Web/ src/SanJacintoVive.Web/
RUN dotnet publish src/SanJacintoVive.Web/SanJacintoVive.Web.csproj -c Release -o /out --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build --chown=app:app /out/ ./
RUN mkdir -p /data/imagenes /data/claves && chown -R app:app /data
ENV ASPNETCORE_HTTP_PORTS=8080 ASPNETCORE_ENVIRONMENT=Production Storage__Root=/data
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "SanJacintoVive.Web.dll"]
