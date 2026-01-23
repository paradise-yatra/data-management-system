import { LeadRecord } from '@/types/record';

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];
const lastWeek = new Date(Date.now() - 604800000).toISOString().split('T')[0];

export const mockRecords: LeadRecord[] = [
  { id: '1', name: 'Rahul Sharma', email: 'rahul.sharma@gmail.com', phone: '+91 98765 43210', interests: ['Bali Trip', 'Honeymoon'], source: 'Website', remarks: 'Interested in honeymoon package', dateAdded: today },
  { id: '2', name: 'Priya Patel', email: 'priya.p@yahoo.com', phone: '', interests: ['Kerala Backwaters', 'Family Trip'], source: 'Instagram', remarks: 'Looking for family trip in December', dateAdded: today },
  { id: '3', name: 'Amit Kumar', email: '', phone: '+91 87654 32109', interests: ['Rajasthan Heritage Tour', 'Group Travel'], source: 'WhatsApp', remarks: 'Group of 8 people', dateAdded: today },
  { id: '4', name: 'Sneha Reddy', email: 'sneha.reddy@outlook.com', phone: '+91 76543 21098', interests: ['Europe Multi-Country', 'Budget Travel'], source: 'Website', remarks: 'Budget around 3L per person', dateAdded: yesterday },
  { id: '5', name: 'Vikram Singh', email: 'vikram.s@gmail.com', phone: '+91 65432 10987', interests: ['Maldives Honeymoon', 'Luxury'], source: 'Referral', remarks: 'Referred by Rahul Sharma', dateAdded: yesterday },
  { id: '6', name: 'Ananya Gupta', email: 'ananya.g@hotmail.com', phone: '', interests: ['Thailand Explorer', 'Solo Travel'], source: 'Facebook', remarks: 'Solo trip inquiry', dateAdded: yesterday },
  { id: '7', name: 'Karthik Nair', email: '', phone: '+91 54321 09876', interests: ['Dubai City Break', '5-Star Hotels'], source: 'Manual', remarks: 'Walk-in customer, wants 5-star hotels only', dateAdded: twoDaysAgo },
  { id: '8', name: 'Meera Iyer', email: 'meera.iyer@gmail.com', phone: '+91 43210 98765', interests: ['Sri Lanka Discovery', 'Cultural Tours'], source: 'Instagram', remarks: 'Interested in cultural tours', dateAdded: twoDaysAgo },
  { id: '9', name: 'Rohan Mehta', email: 'rohan.m@company.com', phone: '+91 32109 87654', interests: ['Andaman Beach Getaway', 'Corporate Retreat'], source: 'Website', remarks: 'Corporate retreat for 20 people', dateAdded: twoDaysAgo },
  { id: '10', name: 'Divya Krishnan', email: 'divya.k@gmail.com', phone: '', interests: ['Himachal Adventure', 'Trekking', 'Camping'], source: 'WhatsApp', remarks: 'Trekking and camping focus', dateAdded: lastWeek },
  { id: '11', name: 'Arjun Menon', email: '', phone: '+91 21098 76543', interests: ['Bali Trip', 'Anniversary'], source: 'Facebook', remarks: 'Anniversary celebration', dateAdded: lastWeek },
  { id: '12', name: 'Pooja Desai', email: 'pooja.d@email.com', phone: '+91 10987 65432', interests: ['Kerala Backwaters', 'Ayurveda'], source: 'Referral', remarks: 'Ayurveda retreat interest', dateAdded: lastWeek },
  { id: '13', name: 'Sanjay Rao', email: 'sanjay.rao@business.com', phone: '+91 98712 34567', interests: ['Europe Multi-Country', 'First Time Travel'], source: 'Website', remarks: 'First time international travel', dateAdded: lastWeek },
  { id: '14', name: 'Lakshmi Venkat', email: 'lakshmi.v@gmail.com', phone: '', interests: ['Maldives Honeymoon', 'Water Villa'], source: 'Instagram', remarks: 'Water villa preference', dateAdded: lastWeek },
  { id: '15', name: 'Nikhil Joshi', email: '', phone: '+91 87612 34567', interests: ['Thailand Explorer', 'Bachelor Party'], source: 'Manual', remarks: 'Bachelor party group', dateAdded: lastWeek },
  { id: '16', name: 'Swati Bhatt', email: 'swati.bhatt@yahoo.com', phone: '+91 76512 34567', interests: ['Dubai City Break', 'Shopping'], source: 'WhatsApp', remarks: 'Shopping focused trip', dateAdded: lastWeek },
  { id: '17', name: 'Gaurav Kapoor', email: 'gaurav.k@outlook.com', phone: '+91 65412 34567', interests: ['Rajasthan Heritage Tour', 'Photography'], source: 'Facebook', remarks: 'Photography tour interest', dateAdded: lastWeek },
  { id: '18', name: 'Ritu Agarwal', email: 'ritu.a@gmail.com', phone: '+91 54312 34567', interests: ['Sri Lanka Discovery', 'Wildlife Safari'], source: 'Website', remarks: 'Wildlife safari priority', dateAdded: lastWeek },
  { id: '19', name: 'Manish Tiwari', email: '', phone: '+91 43212 34567', interests: ['Andaman Beach Getaway', 'Scuba Diving'], source: 'Referral', remarks: 'Scuba diving certification', dateAdded: lastWeek },
  { id: '20', name: 'Kavitha Suresh', email: 'kavitha.s@email.com', phone: '', interests: ['Himachal Adventure', 'Winter Sports'], source: 'Instagram', remarks: 'Winter sports interest', dateAdded: lastWeek },
  { id: '21', name: 'Deepak Choudhury', email: 'deepak.c@gmail.com', phone: '+91 32112 34567', interests: ['Bali Trip', 'Yoga Retreat'], source: 'Website', remarks: 'Yoga retreat focus', dateAdded: lastWeek },
  { id: '22', name: 'Nisha Malhotra', email: 'nisha.m@company.com', phone: '+91 21012 34567', interests: ['Europe Multi-Country', 'Business Travel'], source: 'Manual', remarks: 'Business + leisure combo', dateAdded: lastWeek },
  { id: '23', name: 'Arun Pillai', email: '', phone: '+91 10912 34567', interests: ['Maldives Honeymoon', 'Proposal'], source: 'WhatsApp', remarks: 'Surprise proposal plan', dateAdded: lastWeek },
  { id: '24', name: 'Bhavna Shah', email: 'bhavna.s@hotmail.com', phone: '+91 98723 45678', interests: ['Kerala Backwaters', 'Senior Citizen'], source: 'Facebook', remarks: 'Senior citizen friendly', dateAdded: lastWeek },
  { id: '25', name: 'Rajesh Verma', email: 'rajesh.v@gmail.com', phone: '+91 87623 45678', interests: ['Dubai City Break', 'Luxury'], source: 'Instagram', remarks: 'Luxury hotels only', dateAdded: lastWeek },
];
