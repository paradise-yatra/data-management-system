
try {
    const response = await fetch('http://localhost:3002/api/packages/public');
    const data = await response.json();
    // Log all packages to find one with gallery images
    data.data.forEach(pkg => {
        console.log(`Package: ${pkg.title}`);
        console.log('Images:', JSON.stringify(pkg.images, null, 2));
        console.log('MainImage:', pkg.mainImage);
        console.log('GalleryImages:', JSON.stringify(pkg.galleryImages, null, 2));
        console.log('-------------------');
    });
} catch (error) {
    console.error('Error:', error);
}
