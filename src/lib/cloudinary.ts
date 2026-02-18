
/**
 * Optimization checklist for Cloudinary URLs:
 * 1. Core parameters: q_auto, f_auto
 * 2. Device-aware: w_auto, dpr_auto (if no specific width given)
 * 3. Specific width: w_XXX (if width given)
 * 4. Crop: c_fill (if width/height given)
 */

interface CloudinaryOptions {
    width?: number;
    height?: number;
}

export const optimizeCloudinaryUrl = (url: string, options: CloudinaryOptions = {}) => {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('res.cloudinary.com')) return url;

    // Split the URL to insert transformations
    // Standard pattern: https://res.cloudinary.com/<cloud_name>/image/upload/<transformations>/v<version>/<public_id>.<ext>

    const uploadToken = '/upload/';
    const parts = url.split(uploadToken);
    if (parts.length !== 2) return url;

    const [base, rest] = parts;

    // Base transformations
    const transforms: string[] = ['q_auto', 'f_auto'];

    // Width management
    if (options.width) {
        transforms.push(`w_${options.width}`);
        if (options.height) {
            transforms.push(`h_${options.height}`);
            transforms.push('c_fill');
        } else {
            transforms.push('c_limit');
        }
    } else {
        // Device aware sizing if no specific width
        transforms.push('w_auto');
        transforms.push('dpr_auto');
    }

    // Join transformations
    const transformationString = transforms.join(',');

    return `${base}${uploadToken}${transformationString}/${rest}`;
};
