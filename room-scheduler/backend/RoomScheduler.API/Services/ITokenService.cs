using RoomScheduler.API.Models;

namespace RoomScheduler.API.Services;

public interface ITokenService
{
    string CreateToken(ApplicationUser user, IList<string> roles);
}