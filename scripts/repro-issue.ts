import { prisma } from "../src/lib/db";
import { deleteUserCore } from "../src/app/actions/admin";

async function testUserDeletionLogic() {
    console.log("Starting verification...");

    // Setup: Create a function to make a user and order
    const createTestUser = async (suffix: string, orderStatus: "OPEN" | "DELIVERED" | "CANCELED") => {
        const username = `test_user_${suffix}_${Date.now()}`;
        const user = await prisma.user.create({
            data: {
                username,
                passwordHash: "hash",
                role: "CASHIER",
            }
        });

        if (orderStatus !== "OPEN" && orderStatus !== "DELIVERED" && orderStatus !== "CANCELED") return user; // Just in case

        await prisma.order.create({
            data: {
                orderNo: `ORD-${suffix}-${Date.now()}`,
                paymentMethod: "CASH",
                createdById: user.id,
                status: orderStatus
            }
        });
        return user;
    };

    // TEST 1: User with OPEN order -> Should be BLOCKED
    console.log("\n--- TEST 1: User with OPEN order ---");
    const user1 = await createTestUser("open", "OPEN");

    const result1 = await deleteUserCore(user1.id);
    console.log("Result 1:", result1);

    if (result1.error && result1.error.includes("açık siparişi var")) {
        console.log("SUCCESS: Deletion blocked for OPEN order.");
    } else {
        console.error("FAILURE: Deletion NOT blocked for OPEN order.");
    }


    // TEST 2: User with DELIVERED order -> Should SUCCEED (Soft Delete)
    console.log("\n--- TEST 2: User with DELIVERED order ---");
    const user2 = await createTestUser("delivered", "DELIVERED");

    const result2 = await deleteUserCore(user2.id);
    console.log("Result 2:", result2);

    if (result2.success) {
        // Verify soft delete
        const deletedUser2 = await prisma.user.findUnique({ where: { id: user2.id } });
        if (deletedUser2 && deletedUser2.softDeletedAt && !deletedUser2.isActive) {
            console.log("SUCCESS: User soft deleted.");
            // Verify order still exists
            const count = await prisma.order.count({ where: { createdById: user2.id } });
            if (count === 1) console.log("SUCCESS: Order history preserved.");
            else console.error("FAILURE: Order history lost!");
        } else {
            console.error("FAILURE: User not soft deleted correctly.", deletedUser2);
        }
    } else {
        console.error("FAILURE: Deletion failed for DELIVERED order.", result2.error);
    }


    // TEST 3: User with CANCELED order -> Should SUCCEED (Soft Delete)
    console.log("\n--- TEST 3: User with CANCELED order ---");
    const user3 = await createTestUser("canceled", "CANCELED");

    const result3 = await deleteUserCore(user3.id);
    console.log("Result 3:", result3);

    if (result3.success) {
        console.log("SUCCESS: Deletion allowed for CANCELED order.");
    } else {
        console.error("FAILURE: Deletion failed for CANCELED order.");
    }


    // TEST 4: Reuse Username
    console.log("\n--- TEST 4: Reuse Username ---");

    try {
        const reusedUser = await prisma.user.create({
            data: {
                username: user2.username,
                passwordHash: "newhash",
                role: "ADMIN"
            }
        });
        console.log("SUCCESS: Username reused successfully.", reusedUser.username);
        // Cleanup reused user
        await prisma.user.delete({ where: { id: reusedUser.id } });
    } catch (e) {
        console.error("FAILURE: Could not reuse username.", e);
    }

    // Cleanup
    console.log("\nCleaning up...");
    // We need to delete orders first because of FK constraint, even for soft deleted users if we want to hard delete them now
    // user1 was NOT deleted, so we delete it manually.
    try {
        await prisma.order.deleteMany({ where: { createdById: user1.id } });
        await prisma.user.delete({ where: { id: user1.id } });
    } catch { }

    try {
        await prisma.order.deleteMany({ where: { createdById: user2.id } });
        await prisma.user.delete({ where: { id: user2.id } });
    } catch { }

    try {
        await prisma.order.deleteMany({ where: { createdById: user3.id } });
        await prisma.user.delete({ where: { id: user3.id } });
    } catch { }

    console.log("Done.");
}

testUserDeletionLogic()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
