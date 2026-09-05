// src/utils/errors.ts

export class AppError extends Error {
    public statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message); // JavaScript ki default Error class me message set karta hai
        this.statusCode = statusCode; // Saath me status code attach kar deta hai
        this.name = this.constructor.name; // Error ka naam set karta hai
    }
}

// 400 - Bad Request (Client ne galat data bheja)
export class BadRequestError extends AppError {
    constructor(message: string = "Bad Request") {
        super(message, 400); // 👈 statusCode automatically 400 set ho gaya
    }
}

// 401 - Unauthorized (Token missing ya invalid hai)
export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized") {
        super(message, 401);
    }
}

// 403 - Forbidden (Permission nahi hai)
export class ForbiddenError extends AppError {
    constructor(message: string = "Forbidden") {
        super(message, 403);
    }
}

// 404 - Not Found (User, Trip ya PG nahi mila)
export class NotFoundError extends AppError {
    constructor(message: string = "Resource not found") {
        super(message, 404);
    }
}

// 422 - Validation Error (Dates invalid hain, negative fee hai etc.)
export class ValidationError extends AppError {
    constructor(message: string = "Validation failed") {
        super(message, 422);
    }
}
