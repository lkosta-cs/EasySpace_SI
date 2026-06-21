using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RoomScheduler.API.Migrations
{
    /// <inheritdoc />
    public partial class RemovePendingFunctionality : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Convert any existing Pending bookings (Status=1) to Confirmed (Status=0)
            migrationBuilder.Sql(@"UPDATE ""Bookings"" SET ""Status"" = 0 WHERE ""Status"" = 1;");

            migrationBuilder.DropColumn(
                name: "PendingColor",
                table: "OccasionTypeConfigs");

            migrationBuilder.DropColumn(
                name: "RequiresApproval",
                table: "OccasionTypeConfigs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PendingColor",
                table: "OccasionTypeConfigs",
                type: "text",
                nullable: false,
                defaultValue: "#6b7280");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresApproval",
                table: "OccasionTypeConfigs",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
