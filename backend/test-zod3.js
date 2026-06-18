const { z } = require('zod');
const budgetSchema = z.object({
    income: z.number({ required_error: "Income is required" })
        .positive("Income must be positive")
});
const validation = budgetSchema.safeParse({});
console.log(validation.error.issues);
