import { AppDataSource } from "../database";
import { User } from "../database/entities/User";

async function setupTestUser() {
    try {
        // Initialize the database connection
        await AppDataSource.initialize();
        
        // Create a test user if it doesn't exist
        const userRepository = AppDataSource.getRepository(User);
        let testUser = await userRepository.findOne({
            where: { email: "test@example.com" }
        });

        if (!testUser) {
            testUser = new User();
            testUser.name = "Test User";
            testUser.email = "test@example.com";
            await userRepository.save(testUser);
            console.log("✅ Test user created successfully");
        } else {
            console.log("✅ Test user already exists");
        }

        console.log("Test user ID:", testUser.id);
    } catch (error) {
        console.error("❌ Error setting up test user:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

setupTestUser();
