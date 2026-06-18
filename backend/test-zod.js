const { z } = require('zod');
const budgetSchema = z.object({
    income: z.number({ required_error: "Income is required" })
        .positive("Income must be positive")
});
try {
    const validation = budgetSchema.safeParse({});
    if (!validation.success) {
        console.log(validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        })));
    }
} catch (e) {
    console.error("ERRORED!", e);
}
