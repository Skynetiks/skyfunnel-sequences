// types.ts
export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
};

// utils.ts
export function greetUser(user: User): string {
  return `Hello, ${user.name}! Welcome back.`;
}

// services.ts
export class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.users.push(user);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email === email);
  }

  listAdmins(): User[] {
    return this.users.filter((u) => u.isAdmin);
  }
}

const service = new UserService();

const user1: User = { id: "1", name: "Alice", email: "alice@example.com" };
const user2: User = { id: "2", name: "Bob", email: "bob@example.com", isAdmin: true };

service.addUser(user1);
service.addUser(user2);
