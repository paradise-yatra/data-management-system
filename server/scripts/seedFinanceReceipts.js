import 'dotenv/config';
import Receipt from '../models/Receipt.js';

async function main() {
  try {
    const now = new Date();

    const baseBranding = {
      companyName: 'Paradise Yatra',
      companyAddress: 'Rajouri Garden, New Delhi, India',
      companyPhone: '+91-99999-00000',
      companyEmail: 'finance@paradiseyatra.com',
      companyWebsite: 'www.paradiseyatra.com',
      companyGstin: '',
      logoUrl: '',
      footerNote: 'This is a system-generated receipt and is valid without signature.',
      primaryColor: '#0f766e',
      accentColor: '#7c2d12',
      currencyCode: 'INR',
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
    };

    const mockReceipts = [
      {
        status: 'ISSUED',
        type: 'ADVANCE',
        linkedLeadId: null,
        linkedTripId: null,
        customer: {
          leadName: 'Rahul Sharma',
          phone: '9876543210',
          email: 'rahul.sharma@example.com',
          address: 'Delhi, India',
        },
        tripDetails: {
          tripName: 'Shimla Weekend Getaway',
          destination: 'Shimla',
          travelStartDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
          travelEndDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 13),
        },
        payment: {
          paymentDate: now,
          paymentMode: 'UPI',
          transactionReference: 'UPI-ADV-001',
          receivedAmount: 10000,
        },
        totals: {
          packageAmount: 25000,
          previousPayments: 0,
          totalReceived: 10000,
          pendingAmount: 15000,
        },
        notes: {
          publicNote: 'Advance received for Shimla package.',
          internalNote: 'Customer prefers early morning departure.',
          voidReason: '',
        },
        brandingSnapshot: baseBranding,
        statusMeta: {
          issued: true,
        },
      },
      {
        status: 'ISSUED',
        type: 'PARTIAL',
        linkedLeadId: null,
        linkedTripId: null,
        customer: {
          leadName: 'Priya Verma',
          phone: '9811112233',
          email: 'priya.verma@example.com',
          address: 'Mumbai, India',
        },
        tripDetails: {
          tripName: 'Kerala Honeymoon',
          destination: 'Munnar, Alleppey',
          travelStartDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
          travelEndDate: new Date(now.getFullYear(), now.getMonth() + 1, 12),
        },
        payment: {
          paymentDate: now,
          paymentMode: 'Bank Transfer',
          transactionReference: 'NEFT-PRY-2026-01',
          receivedAmount: 40000,
        },
        totals: {
          packageAmount: 90000,
          previousPayments: 0,
          totalReceived: 40000,
          pendingAmount: 50000,
        },
        notes: {
          publicNote: 'Partial payment for Kerala honeymoon package.',
          internalNote: 'Send hotel vouchers after final payment.',
          voidReason: '',
        },
        brandingSnapshot: baseBranding,
      },
      {
        status: 'DRAFT',
        type: 'FULL',
        linkedLeadId: null,
        linkedTripId: null,
        customer: {
          leadName: 'Ankit Singh',
          phone: '9990011223',
          email: 'ankit.singh@example.com',
          address: 'Jaipur, Rajasthan, India',
        },
        tripDetails: {
          tripName: 'Goa Friends Trip',
          destination: 'North Goa',
          travelStartDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20),
          travelEndDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 24),
        },
        payment: {
          paymentDate: now,
          paymentMode: 'Cash',
          transactionReference: '',
          receivedAmount: 0,
        },
        totals: {
          packageAmount: 45000,
          previousPayments: 0,
          totalReceived: 0,
          pendingAmount: 45000,
        },
        notes: {
          publicNote: '',
          internalNote: 'Customer will confirm dates this week.',
          voidReason: '',
        },
        brandingSnapshot: baseBranding,
      },
      {
        status: 'ISSUED',
        type: 'FULL',
        linkedLeadId: null,
        linkedTripId: null,
        customer: {
          leadName: 'Sneha Iyer',
          phone: '9822334455',
          email: 'sneha.iyer@example.com',
          address: 'Bangalore, India',
        },
        tripDetails: {
          tripName: 'Kashmir Luxury Package',
          destination: 'Srinagar, Gulmarg, Pahalgam',
          travelStartDate: new Date(now.getFullYear(), now.getMonth() + 2, 2),
          travelEndDate: new Date(now.getFullYear(), now.getMonth() + 2, 9),
        },
        payment: {
          paymentDate: now,
          paymentMode: 'Card',
          transactionReference: 'VISA-8912',
          receivedAmount: 120000,
        },
        totals: {
          packageAmount: 120000,
          previousPayments: 0,
          totalReceived: 120000,
          pendingAmount: 0,
        },
        notes: {
          publicNote: 'Full payment received.',
          internalNote: 'VIP client, arrange airport pickup with placard.',
          voidReason: '',
        },
        brandingSnapshot: baseBranding,
      },
      {
        status: 'DRAFT',
        type: 'ADVANCE',
        linkedLeadId: null,
        linkedTripId: null,
        customer: {
          leadName: 'Karan Mehta',
          phone: '9800123456',
          email: 'karan.mehta@example.com',
          address: 'Ahmedabad, India',
        },
        tripDetails: {
          tripName: 'Andaman Family Vacation',
          destination: 'Port Blair, Havelock',
          travelStartDate: new Date(now.getFullYear(), now.getMonth() + 3, 15),
          travelEndDate: new Date(now.getFullYear(), now.getMonth() + 3, 21),
        },
        payment: {
          paymentDate: now,
          paymentMode: 'Cheque',
          transactionReference: 'CHQ-9988',
          receivedAmount: 15000,
        },
        totals: {
          packageAmount: 75000,
          previousPayments: 0,
          totalReceived: 15000,
          pendingAmount: 60000,
        },
        notes: {
          publicNote: 'Token amount received; balance due before ticketing.',
          internalNote: '',
          voidReason: '',
        },
        brandingSnapshot: baseBranding,
      },
    ];

    console.log('Inserting mock finance receipts (manual entries, no leads)...');
    const result = await Receipt.insertMany(
      mockReceipts.map((r) => ({
        ...r,
        issuedAt: r.status === 'ISSUED' ? now : null,
        createdBy: null,
        updatedBy: null,
        createdByName: 'System seed',
      })),
    );

    console.log(`Inserted ${result.length} finance receipts.`);
  } catch (error) {
    console.error('Failed to seed finance receipts:', error);
  } finally {
    if (Receipt.db) {
      await Receipt.db.close();
    }
    process.exit(0);
  }
}

main();

