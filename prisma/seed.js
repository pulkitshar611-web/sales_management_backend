const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@salesmanager.com' },
        update: {},
        create: {
            email: 'admin@salesmanager.com',
            password: adminPassword,
            role: 'ADMIN',
            adminSettings: {
                create: {
                    profileName: 'Administrator',
                    phone: '+91 98100 12345',
                    company: 'Sales Manager Pro',
                    language: 'en',
                    currency: 'INR'
                }
            }
        }
    });
    console.log('✅ Admin user created:', admin.email);

    // 2. Create Customer User
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customerUser = await prisma.user.upsert({
        where: { email: 'customer@example.com' },
        update: {},
        create: {
            email: 'customer@example.com',
            password: customerPassword,
            role: 'CUSTOMER'
        }
    });

    const customer = await prisma.customer.upsert({
        where: { userId: customerUser.id },
        update: {},
        create: {
            userId: customerUser.id,
            name: 'Acme Corporation',
            phone: '+91 98100 11111',
            location: 'Mumbai, India',
            company: 'Acme Corporation'
        }
    });
    console.log('✅ Customer user created:', customerUser.email);

    // 3. Create Additional Customers
    const customersData = [
        { name: 'Global Tech Solutions', email: 'info@globaltech.com', phone: '+91 98100 22222', location: 'Delhi, India', company: 'Global Tech Solutions' },
        { name: 'Sunrise Industries', email: 'admin@sunrise.com', phone: '+91 98100 33333', location: 'Bangalore, India', company: 'Sunrise Industries' },
        { name: 'BlueStar Trading Co.', email: 'sales@bluestar.com', phone: '+91 98100 44444', location: 'Pune, India', company: 'BlueStar Trading' },
        { name: 'Horizon Logistics', email: 'info@horizon.com', phone: '+91 98100 55555', location: 'Chennai, India', company: 'Horizon Logistics' }
    ];

    for (const data of customersData) {
        const pass = await bcrypt.hash('password123', 10);
        const u = await prisma.user.create({
            data: {
                email: data.email,
                password: pass,
                role: 'CUSTOMER',
                customer: {
                    create: {
                        name: data.name,
                        phone: data.phone,
                        location: data.location,
                        company: data.company
                    }
                }
            }
        });
        console.log(`✅ Created customer: ${data.name}`);
    }

    // 4. Create Initial Sales
    const acme = await prisma.customer.findFirst({ where: { name: 'Acme Corporation' } });
    const globalTech = await prisma.customer.findFirst({ where: { name: 'Global Tech Solutions' } });

    if (acme && globalTech) {
        await prisma.sale.createMany({
            data: [
                {
                    customerId: acme.id,
                    product: 'Enterprise Software License',
                    amount: 48500,
                    dueDate: new Date('2026-03-12'),
                    status: 'PENDING',
                    notes: 'Annual license for ERP'
                },
                {
                    customerId: globalTech.id,
                    product: 'Annual Support Package',
                    amount: 12400,
                    dueDate: new Date('2026-04-28'),
                    status: 'PAID',
                    notes: 'Support for CRM'
                }
            ]
        });
        console.log('✅ Initial sales created.');
    }

    // 5. Initial Reminder Settings
    await prisma.reminderSettings.create({
        data: {
            daysBefore: [1, 3],
            channels: ['email'],
            template: `Hello {CustomerName},\n\nThis is a friendly reminder that your payment of ₹{Amount} for "{Product}" is due on {DueDate}.\n\nPlease complete the payment at your earliest convenience.\n\nThank you,\nSales Management Team`,
        }
    });
    console.log('✅ Default reminder settings created.');

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
