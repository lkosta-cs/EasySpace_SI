using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RoomScheduler.API.Models;
using System;
using System.Collections.Generic;
using System.Linq;
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

        // Rooms were inserted with explicit Ids, so the DB's auto-increment sequence
        // never advanced — bump it now or the next auto-generated insert will collide
        await db.Database.ExecuteSqlRawAsync(
            "SELECT setval(pg_get_serial_sequence('\"Rooms\"', 'Id'), COALESCE((SELECT MAX(\"Id\") FROM \"Rooms\"), 0) + 1, false);");

        // ==========================================
        // 2. GENERISANJE KORISNIKA 
        // ==========================================
        var professors = new List<ApplicationUser>
        {
            new() { Id = "u-prof-1", UserName = "milos.dikic@roomscheduler.local", Email = "milos.dikic@roomscheduler.local", FirstName = "Miloš", LastName = "Dikić", Role = UserRole.Professor, Title = "Prof. dr", Department = Department.DEPARTMENT_EL, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-prof-2", UserName = "nikola.stankovic@roomscheduler.local", Email = "nikola.stankovic@roomscheduler.local", FirstName = "Nikola", LastName = "Stanković", Role = UserRole.Professor, Title = "Prof. dr", Department = Department.DEPARTMENT_CSY, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-prof-3", UserName = "dragan.radenkovic@roomscheduler.local", Email = "dragan.radenkovic@roomscheduler.local", FirstName = "Dragan", LastName = "Radenković", Role = UserRole.Professor, Title = "Doc. dr", Department = Department.DEPARTMENT_TE, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-prof-4", UserName = "slobodan.marinkovic@roomscheduler.local", Email = "slobodan.marinkovic@roomscheduler.local", FirstName = "Slobodan", LastName = "Marinković", Role = UserRole.Professor, Title = "Doc. dr", Department = Department.DEPARTMENT_TEE, IsActive = true, EmailConfirmed = true }
        };

        var assistants = new List<ApplicationUser>
        {
            new() { Id = "u-asist-1", UserName = "jelena.petrovic@roomscheduler.local", Email = "jelena.petrovic@roomscheduler.local", FirstName = "Jelena", LastName = "Petrović", Role = UserRole.Assistant, Title = "Asistent", Department = Department.DEPARTMENT_GE, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-asist-2", UserName = "marko.jovanovic@roomscheduler.local", Email = "marko.jovanovic@roomscheduler.local", FirstName = "Marko", LastName = "Jovanović", Role = UserRole.Assistant, Title = "Asistent", Department = Department.DEPARTMENT_MA, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-asist-3", UserName = "katarina.vukovic@roomscheduler.local", Email = "katarina.vukovic@roomscheduler.local", FirstName = "Katarina", LastName = "Vuković", Role = UserRole.Assistant, Title = "Asistent", Department = Department.DEPARTMENT_PE, IsActive = true, EmailConfirmed = true },
            new() { Id = "u-asist-4", UserName = "stefan.bogdanovic@roomscheduler.local", Email = "stefan.bogdanovic@roomscheduler.local", FirstName = "Stefan", LastName = "Bogdanović", Role = UserRole.Assistant, Title = "Asistent", Department = Department.DEPARTMENT_MI, IsActive = true, EmailConfirmed = true }
        };

        var allStaff = professors.Concat(assistants).ToList();
        foreach (var user in allStaff)
        {
            user.NormalizedUserName = user.UserName!.ToUpper();
            user.NormalizedEmail = user.Email!.ToUpper();
            await userManager.CreateAsync(user, "TestPassword123!");
        }

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
        // 3. SELEKCIJA KORISNIKA I GENERISANJE REZERVACIJA
        // ==========================================
        var rand = new Random(42); // Fiksni seed radi konzistentnosti pri svakom seed-ovanju
        
        // Nasumično biramo 2 profesora i 2 asistenta
        var selectedProfessors = professors.OrderBy(_ => rand.Next()).Take(2).ToList();
        var selectedAssistants = assistants.OrderBy(_ => rand.Next()).Take(2).ToList();
        var activeStaff = selectedProfessors.Concat(selectedAssistants).ToList();

        var bookings = new List<Booking>();
        int bookingIdCounter = 1;

        // Vremenske odrednice na osnovu današnjeg datuma pokretanja skripte
        DateTime seedStartDate = DateTime.UtcNow.Date; 
        DateTime periodStart = seedStartDate.AddMonths(-1); // Mesec dana u prošlost
        DateTime periodEnd = seedStartDate.AddMonths(1);    // Mesec dana u budućnost (Ukupno 2 meseca)

        // Evidencija zauzetosti: "SobaId_Date_Slot" i "UserId_Date_Slot" da sprečimo bilo kakva preklapanja
        var occupiedSlots = new HashSet<string>();

        // Definisani fiksni školski dvočasi / tročasi radi preglednosti
        int[] dailySlots = { 8, 11, 14, 17 }; 
        double slotDurationHours = 2.5;

        // --- 3a. GENERISANJE RECURRING BOOKINGA (1 serija po korisniku) ---
        foreach (var staff in activeStaff)
        {
            OccasionType occasion = staff.Role == UserRole.Assistant ? OccasionType.LabVezbe : OccasionType.Ispit;
            string notes = staff.Role == UserRole.Assistant ? "Redovne Laboratorijske Vežbe" : "Redovna Predavanja / Ispitni rokovi";
            
            Guid recurringGroupId = Guid.NewGuid();
            bool isRootAssigned = false;

            // Biramo pogodan dan u nedelji i fiksni sat koji su slobodni za prvu nedelju
            int chosenRoomId = 1;
            int chosenHour = dailySlots[rand.Next(dailySlots.Length)];
            DayOfWeek chosenDay = (DayOfWeek)rand.Next(1, 6); // Ponedeljak - Petak

            // Pronalazimo prvu sobu koja je potpuno slobodna za ovu seriju kroz ceo period
            bool roomFound = false;
            for (int r = 1; r <= 20; r++)
            {
                bool hasConflict = false;
                // Prolazimo kroz sve nedelje u opsegu od 2 meseca
                for (DateTime date = periodStart; date <= periodEnd; date = date.AddDays(1))
                {
                    if (date.DayOfWeek == chosenDay)
                    {
                        string roomKey = $"{r}_{date:yyyyMMdd}_{chosenHour}";
                        string userKey = $"{staff.Id}_{date:yyyyMMdd}_{chosenHour}";
                        if (occupiedSlots.Contains(roomKey) || occupiedSlots.Contains(userKey))
                        {
                            hasConflict = true;
                            break;
                        }
                    }
                }

                if (!hasConflict)
                {
                    chosenRoomId = r;
                    roomFound = true;
                    break;
                }
            }

            // Ako nismo našli idealnu sobu, uzimamo fallback rotaciju baziranu na ID-ju korisnika
            if (!roomFound)
            {
                chosenRoomId = (staff.Id.GetHashCode() % 20) + 1;
            }

            // Upisujemo seriju kroz čitav period od 2 meseca (nedeljno ponavljanje)
            for (DateTime date = periodStart; date <= periodEnd; date = date.AddDays(1))
            {
                if (date.DayOfWeek != chosenDay) continue;

                DateTime start = date.AddHours(chosenHour);
                DateTime end = start.AddHours(slotDurationHours);

                string roomKey = $"{chosenRoomId}_{date:yyyyMMdd}_{chosenHour}";
                string userKey = $"{staff.Id}_{date:yyyyMMdd}_{chosenHour}";

                // Zauzimamo slotove
                occupiedSlots.Add(roomKey);
                occupiedSlots.Add(userKey);

                bool isRoot = !isRootAssigned;
                if (isRoot) isRootAssigned = true;

                bookings.Add(new Booking
                {
                    Id = bookingIdCounter++,
                    RoomId = chosenRoomId,
                    UserId = staff.Id,
                    Start = start,
                    End = end,
                    Notes = notes,
                    IsCancelled = false,
                    OccasionType = occasion,
                    RecurringGroupId = recurringGroupId,
                    IsRecurringRoot = isRoot,
                    RecurrencePattern = isRoot ? RecurrencePattern.Weekly : null,
                    RecurrenceEndDate = isRoot ? periodEnd : null
                });
            }
        }

        // --- 3b. GENERISANJE NON-RECURRING BOOKINGA (6 po korisniku) ---
        int totalDaysInPeriod = (periodEnd - periodStart).Days;

        foreach (var staff in activeStaff)
        {
            int createdNonRecurring = 0;
            int attempts = 0;

            // Pokušavamo da smestimo tačno 6 nasumičnih pojedinačnih događaja bez preklapanja
            while (createdNonRecurring < 6 && attempts < 500)
            {
                attempts++;
                
                // Biramo nasumičan dan u opsegu od 2 meseca
                int randomDayOffset = rand.Next(totalDaysInPeriod + 1);
                DateTime randomDate = periodStart.AddDays(randomDayOffset);

                // Preskačemo vikende radi realističnosti
                if (randomDate.DayOfWeek == DayOfWeek.Saturday || randomDate.DayOfWeek == DayOfWeek.Sunday)
                    continue;

                int randomHour = dailySlots[rand.Next(dailySlots.Length)];
                int randomRoomId = rand.Next(1, 21);

                string roomKey = $"{randomRoomId}_{randomDate:yyyyMMdd}_{randomHour}";
                string userKey = $"{staff.Id}_{randomDate:yyyyMMdd}_{randomHour}";

                // Ako su soba ili profesor već zauzeti u tom slotu, idemo u narednu iteraciju (tražimo slobodan)
                if (occupiedSlots.Contains(roomKey) || occupiedSlots.Contains(userKey))
                    continue;

                // Ako je asistent, dozvoljene su mu samo lab vežbe, profesorima kolokvijumi/ispiti
                OccasionType occasion = staff.Role == UserRole.Assistant 
                    ? OccasionType.LabVezbe 
                    : (rand.Next(2) == 0 ? OccasionType.Kolokvijum : OccasionType.Ispit);

                string notes = occasion == OccasionType.Kolokvijum ? "Vanredni Kolokvijum" : 
                               occasion == OccasionType.Ispit ? "Vanredni Ispitni Rok" : "Dodatni termin za vežbe";

                DateTime start = randomDate.AddHours(randomHour);
                DateTime end = start.AddHours(slotDurationHours);

                // Označavamo slotove kao zauzete
                occupiedSlots.Add(roomKey);
                occupiedSlots.Add(userKey);

                bookings.Add(new Booking
                {
                    Id = bookingIdCounter++,
                    RoomId = randomRoomId,
                    UserId = staff.Id,
                    Start = start,
                    End = end,
                    Notes = notes,
                    IsCancelled = false,
                    OccasionType = occasion,
                    RecurringGroupId = null,
                    IsRecurringRoot = false,
                    RecurrencePattern = null,
                    RecurrenceEndDate = null
                });

                createdNonRecurring++;
            }
        }

        db.Bookings.AddRange(bookings);
        await db.SaveChangesAsync();

        // Same as Rooms above — Bookings were also seeded with explicit Ids
        await db.Database.ExecuteSqlRawAsync(
            "SELECT setval(pg_get_serial_sequence('\"Bookings\"', 'Id'), COALESCE((SELECT MAX(\"Id\") FROM \"Bookings\"), 0) + 1, false);");
    }
}