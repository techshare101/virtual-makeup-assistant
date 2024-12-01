import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { Consultation } from "./entities/Consultation";
import path from "path";

const AppDataSource = new DataSource({
    type: "sqlite",
    database: path.join(__dirname, "../../makeup_assistant.db"),
    entities: [User, Consultation],
    synchronize: true,
    logging: true
});

const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();
        console.log("Database has been initialized!");
    } catch (error) {
        console.error("Error during database initialization:", error);
        throw error;
    }
};

export { AppDataSource, initializeDatabase };
