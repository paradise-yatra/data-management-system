import { motion, Variants } from 'framer-motion';
import React from 'react';
import { cn } from '@/lib/utils';

type Preset = 'fade-in-blur' | 'slide-up' | 'scale';

interface TextEffectProps {
    children: string;
    preset?: Preset;
    speedReveal?: number;
    speedSegment?: number;
    className?: string;
    delay?: number;
}

export function TextEffect({
    children,
    preset = 'fade-in-blur',
    speedReveal = 1.1,
    speedSegment = 0.3,
    className,
    delay = 0.2
}: TextEffectProps) {
    // Split text into words
    const words = children.split(" ");

    const container: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: speedSegment,
                delayChildren: delay
            }
        }
    };

    const presets: Record<string, Variants> = {
        'fade-in-blur': {
            hidden: {
                opacity: 0,
                filter: 'blur(10px)',
                y: 10
            },
            visible: {
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                transition: {
                    duration: speedReveal,
                    ease: "easeOut"
                }
            }
        },
        'slide-up': {
            hidden: {
                opacity: 0,
                y: 20
            },
            visible: {
                opacity: 1,
                y: 0,
                transition: {
                    duration: speedReveal,
                    ease: "easeOut"
                }
            }
        },
        'scale': {
            hidden: {
                opacity: 0,
                scale: 0.5
            },
            visible: {
                opacity: 1,
                scale: 1,
                transition: {
                    duration: speedReveal
                }
            }
        }
    };

    const item = presets[preset] || presets['fade-in-blur'];

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className={cn("flex flex-wrap justify-center", className)}
        >
            {words.map((word, i) => (
                <motion.span key={i} variants={item} className="inline-block mr-[0.25em] last:mr-0">
                    {word}
                </motion.span>
            ))}
        </motion.div>
    );
}
