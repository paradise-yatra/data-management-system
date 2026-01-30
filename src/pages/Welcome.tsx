import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TextEffect } from '@/components/core/text-effect';

export default function Welcome() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const now = new Date();
        const hour = now.getHours();

        // 4 am - 12pm = good morning
        // 12pm - 4pm = good afternoon
        // 4pm - 4am = good evening

        if (hour >= 4 && hour < 12) {
            setGreeting('Good Morning');
        } else if (hour >= 12 && hour < 16) {
            setGreeting('Good Afternoon');
        } else {
            setGreeting('Good Evening');
        }

        // Navigate to dashboard after animation
        const timer = setTimeout(() => {
            navigate('/', { replace: true });
        }, 4000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground text-center">
                <TextEffect preset="fade-in-blur" speedReveal={1.1} speedSegment={0.3}>
                    {`${greeting} ${user?.name ? user.name.split(' ')[0] : ''}!`}
                </TextEffect>
            </h1>
        </div>
    );
}
