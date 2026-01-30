
try {
    const response = await fetch('http://localhost:3002/api/packages/public');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
} catch (error) {
    console.error('Error:', error);
}
