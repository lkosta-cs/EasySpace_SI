using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RoomScheduler.API.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace RoomScheduler.API.Data;

public static class DevTestDbSeeder
{
    public static async Task SeedTestDataAsync(IServiceProvider services)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var db = services.GetRequiredService<AppDbContext>();

        // Pokreće se samo ako je baza prazna da se ne bi duplirali podaci
        if (await db.Rooms.AnyAsync()) return;

        // ==========================================
        // 1. GENERISANJE 20 SOBA I NJIHOVOG SOFTVERA
        // ==========================================
        var rooms = new List<Room>();
        string[] roomPrefixes = { "Amfiteatar", "Učionica", "Računarska Laboratorija", "Sala za sastanke" };
        
        for (int i = 1; i <= 20; i++)
        {
            string prefix = roomPrefixes[(i - 1) % roomPrefixes.Length];
            int seats = prefix.Contains("Amfiteatar") ? 150 : (prefix.Contains("Laboratorija") ? 32 : 60);
            
            var room = new Room
            {
                Id = i,
                Name = $"{prefix[0]}{i}", // A1, U2, R3, S4...
                Seats = seats,
                Description = $"{prefix} {i} na Elektronskom fakultetu.",
                IsActive = true
            };
            rooms.Add(room);

            // SVAKA soba dobija softverske pakete u zavisnosti od tipa
            if (prefix.Contains("Laboratorija") || prefix.Contains("Amfiteatar"))
            {
                db.SoftwarePackages.Add(new SoftwarePackage { Name = "Visual Studio 2022", RoomId = i });
                db.SoftwarePackages.Add(new SoftwarePackage { Name = "Docker Desktop", RoomId = i });
                db.SoftwarePackages.Add(new SoftwarePackage { Name = "PostgreSQL 16", RoomId = i });
            }
            else
            {
                db.SoftwarePackages.Add(new SoftwarePackage { Name = "MS Office 365", RoomId = i });
                db.SoftwarePackages.Add(new SoftwarePackage { Name = "Adobe Acrobat Reader", RoomId = i });
            }
        }
        db.Rooms.AddRange(rooms);
        await db.SaveChangesAsync();

        // ==========================================
        // 2. GENERISANJE KORISNIKA 
        // ==========================================
        
        // 2a. 4 PROFESORA + 4 ASISTENTA (Sa različitim departmanima)
        var staffUsers = new List<ApplicationUser>
        {
            new() { Id = "u-prof-1", UserName = "milos.dikic@roomscheduler.local", Email = "milos.dikic@roomscheduler.local", FirstName = "Miloš", LastName = "Dikić", Role = UserRole.Professor, Title = "Prof. dr", Department = Department.DEPARTMENT_EL, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-prof-2", UserName = "nikola.stankovic@roomscheduler.local", Email = "nikola.stankovic@roomscheduler.local", FirstName = "Nikola", LastName = "Stanković", Role = UserRole.Professor, Title = "Prof. dr", Department = Department.DEPARTMENT_CSY, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-prof-3", UserName = "dragan.radenkovic@roomscheduler.local", Email = "dragan.radenkovic@roomscheduler.local", FirstName = "Dragan", LastName = "Radenković", Role = UserRole.Professor, Title = "Doc. dr", Department = Department.DEPARTMENT_TE, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-prof-4", UserName = "slobodan.marinkovic@roomscheduler.local", Email = "slobodan.marinkovic@roomscheduler.local", FirstName = "Slobodan", LastName = "Marinković", Role = UserRole.Professor, Title = "Doc. dr", Department = Department.DEPARTMENT_TEE, IsActive = true, EmailConfirmed = true },
            
            new() { Id = "u-asist-1", UserName = "jelena.petrovic@roomscheduler.local", Email = "jelena.petrovic@roomscheduler.local", FirstName = "Jelena", LastName = "Petrović", Role = UserRole.Professor, Title = "Asistent", Department = Department.DEPARTMENT_GE, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-asist-2", UserName = "marko.jovanovic@roomscheduler.local", Email = "marko.jovanovic@roomscheduler.local", FirstName = "Marko", LastName = "Jovanović", Role = UserRole.Professor, Title = "Asistent", Department = Department.DEPARTMENT_MA, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-asist-3", UserName = "katarina.vukovic@roomscheduler.local", Email = "katarina.vukovic@roomscheduler.local", FirstName = "Katarina", LastName = "Vuković", Role = UserRole.Professor, Title = "Asistent", Department = Department.DEPARTMENT_PE, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-asist-4", UserName = "stefan.bogdanovic@roomscheduler.local", Email = "stefan.bogdanovic@roomscheduler.local", FirstName = "Stefan", LastName = "Bogdanović", Role = UserRole.Professor, Title = "Asistent", Department = Department.DEPARTMENT_MI, IsActive = true, EmailConfirmed = true }
        };

        foreach (var user in staffUsers)
        {
            user.NormalizedUserName = user.UserName!.ToUpper();
            user.NormalizedEmail = user.Email!.ToUpper();
            await userManager.CreateAsync(user, "TestPassword123!");
        }

        // 2b. GENERISANJE 6 STUDENATA (Uloga User, imaju indexe, ali NEMAJU rezervacije)
        var students = new List<ApplicationUser>
        {
            new() { Id = "u-stud-1", UserName = "luka.kostadinovic@roomscheduler.local", Email = "luka.kostadinovic@roomscheduler.local", FirstName = "Luka", LastName = "Kostadinović", Role = UserRole.User, IndexNumber = 19697, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-stud-2", UserName = "lazar.kostic@roomscheduler.local", Email = "lazar.kostic@roomscheduler.local", FirstName = "Lazar", LastName = "Kostić", Role = UserRole.User, IndexNumber = 19700, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-stud-3", UserName = "ana.nikolic@roomscheduler.local", Email = "ana.nikolic@roomscheduler.local", FirstName = "Ana", LastName = "Nikolić", Role = UserRole.User, IndexNumber = 19612, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-stud-4", UserName = "stefan.ilic@roomscheduler.local", Email = "stefan.ilic@roomscheduler.local", FirstName = "Stefan", LastName = "Ilić", Role = UserRole.User, IndexNumber = 19543, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-stud-5", UserName = "milica.stamenkovic@roomscheduler.local", Email = "milica.stamenkovic@roomscheduler.local", FirstName = "Milica", LastName = "Stamenković", Role = UserRole.User, IndexNumber = 19821, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-stud-6", UserName = "nikola.vuckovic@roomscheduler.local", Email = "nikola.vuckovic@roomscheduler.local", FirstName = "Nikola", LastName = "Vučković", Role = UserRole.User, IndexNumber = 19744, IsActive = true, EmailConfirmed = true }
        };

        foreach (var student in students)
        {
            student.NormalizedUserName = student.UserName!.ToUpper();
            student.NormalizedEmail = student.Email!.ToUpper();
            await userManager.CreateAsync(student, "TestPassword123!");
        }

        // ==========================================
        // 3. GENERISANJE ~100 REZERVACIJA 
        // (Garantovano: samo za osoblje i bez duplih termina po profesoru)
        // ==========================================
        var bookings = new List<Booking>();
        var baseDate = DateTime.UtcNow.Date;
        
        string[] notesTemplates = { 
            "Predavanje iz Softverskog Inženjerstva", 
            "Laboratorijske vežbe - Grupa 1", 
            "Polaganje kolokvijuma", 
            "Konsultacije sa studentima", 
            "Prezentacija naučnog rada", 
            "Sastanak katedre" 
        };

        int bookingIdCounter = 1;
        int[] slots = { 8, 11, 14, 17 };

        for (int dayOffset = 0; dayOffset < 14; dayOffset++)
        {
            DateTime currentDay = baseDate.AddDays(dayOffset);
            if (currentDay.DayOfWeek == DayOfWeek.Saturday || currentDay.DayOfWeek == DayOfWeek.Sunday)
                continue; // Preskačemo vikende

            foreach (var startHour in slots)
            {
                // Idemo po indeksu osoblja (staffUsers) – ima ih tačno 8.
                // Svaki dobija tačno jednu rezervaciju u ovom satu, tako da niko nema dupli termin!
                for (int staffIndex = 0; staffIndex < staffUsers.Count; staffIndex++)
                {
                    var teacher = staffUsers[staffIndex];
                    
                    // Rotiramo sobe (1-20) na osnovu dana, sata i profesora
                    int roomId = ((dayOffset * 5 + startHour + staffIndex) % 20) + 1;

                    DateTime start = currentDay.AddHours(startHour);
                    DateTime end = start.AddHours(2.5); // Trajanje 2h 30min

                    string notes = notesTemplates[(dayOffset + staffIndex) % notesTemplates.Length];
                    OccasionType occasion = (OccasionType)((dayOffset + staffIndex) % 3);
                    
                    // Svaka 10. rezervacija je otkazana radi testiranja UI filtera (IsCancelled = true)
                    bool isCancelled = (dayOffset + staffIndex) % 10 == 0;

                    bookings.Add(new Booking
                    {
                        Id = bookingIdCounter++,
                        RoomId = roomId,
                        UserId = teacher.Id,
                        Start = start,
                        End = end,
                        Notes = isCancelled ? $"[OTKAZANO] {notes}" : notes,
                        IsCancelled = isCancelled,
                        OccasionType = occasion,
                        IsRecurringRoot = false
                    });
                }
            }
        }

        db.Bookings.AddRange(bookings);
        await db.SaveChangesAsync();
    }
}