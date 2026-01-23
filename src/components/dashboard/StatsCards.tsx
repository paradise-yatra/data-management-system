import { motion } from 'framer-motion';
import { Users, Mail, Phone, CalendarPlus } from 'lucide-react';
import { LeadRecord } from '@/types/record';

interface StatsCardsProps {
  records: LeadRecord[];
}

export function StatsCards({ records }: StatsCardsProps) {
  // Get today's date in IST
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const today = istDate.toISOString().split('T')[0];
  
  const stats = [
    {
      label: 'Total Records',
      value: records.length,
      icon: Users,
    },
    {
      label: 'Records with Email',
      value: records.filter((r) => r.email).length,
      icon: Mail,
    },
    {
      label: 'Records with Phone',
      value: records.filter((r) => r.phone).length,
      icon: Phone,
    },
    {
      label: 'Added Today',
      value: records.filter((r) => {
        // Check if dateAdded is today (handle both date-only and datetime formats)
        const recordDate = r.dateAdded.includes('T') 
          ? r.dateAdded.split('T')[0] 
          : r.dateAdded;
        return recordDate === today;
      }).length,
      icon: CalendarPlus,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={cardVariants}
          className="rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
              </p>
            </div>
            <div className="rounded-full bg-muted p-3">
              <stat.icon className="h-5 w-5 text-foreground" />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
