import { toast } from 'sonner';

export const COLORS = {
    success: 'hsl(142, 76%, 36%)',
    error: 'hsl(0, 84%, 60%)',
    warning: 'hsl(45, 93%, 47%)',
};

export const showToast = {
    success: (message: string) => {
        toast.success(message, {
            style: {
                background: COLORS.success,
                color: 'white',
                border: 'none',
            },
        });
    },
    error: (message: string) => {
        toast.error(message, {
            style: {
                background: COLORS.error,
                color: 'white',
                border: 'none',
            },
        });
    },
    warning: (message: string) => {
        toast(message, {
            style: {
                background: COLORS.warning,
                color: 'white',
                border: 'none',
            },
        });
    },
    info: (message: string) => {
        toast(message, {
            style: {
                background: COLORS.warning, // Using yellow for info as per user request "something other than these 2 - yellow"
                color: 'white',
                border: 'none',
            },
        });
    },
};
