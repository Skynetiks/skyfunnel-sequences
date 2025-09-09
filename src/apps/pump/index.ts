import { createServiceLogger, logExecutionTime } from "../../utils/index.js";

// Create a logger with context for the pump service
const pumpLogger = createServiceLogger("pump");

pumpLogger.info("Pump service starting up");

// types.ts
export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
};

// utils.ts
export function greetUser(user: User): string {
  const message = `Hello, ${user.name}! Welcome back.`;
  pumpLogger.debug("Greeting user", { userId: user.id, userName: user.name });
  return message;
}

// services.ts
export class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    pumpLogger.info("Adding new user", { userId: user.id, email: user.email });
    this.users.push(user);
  }

  getUserByEmail(email: string): User | undefined {
    pumpLogger.debug("Looking up user by email", { email });
    const user = this.users.find((u) => u.email === email);
    if (user) {
      pumpLogger.debug("User found", { userId: user.id });
    } else {
      pumpLogger.warn("User not found", { email });
    }
    return user;
  }

  listAdmins(): User[] {
    pumpLogger.debug("Listing admin users");
    const admins = this.users.filter((u) => u.isAdmin);
    pumpLogger.info("Admin users retrieved", { count: admins.length });
    return admins;
  }
}

// Example usage with execution time logging
const service = new UserService();

const user1: User = { id: "1", name: "Alice", email: "alice@example.com" };
const user2: User = { id: "2", name: "Bob", email: "bob@example.com", isAdmin: true };

// Log the user creation process
await logExecutionTime(
  pumpLogger,
  "User service initialization",
  () => {
    service.addUser(user1);
    service.addUser(user2);

    // Test the service methods
    const foundUser = service.getUserByEmail("alice@example.com");
    const admins = service.listAdmins();
    const greeting = greetUser(foundUser!);

    pumpLogger.info("Service initialization completed", {
      totalUsers: 2,
      adminCount: admins.length,
      greeting,
    });
  },
  { operation: "startup" },
);

pumpLogger.info("Pump service ready");
