const axios = require('axios');

async function test() {
    try {
        const loginRes = await axios.post('http://127.0.0.1:5197/api/Auth/teacher-login', {
            email: 'admin@neocebu.com',
            password: 'Admin123!'
        });
        const token = loginRes.data.token;
        console.log('Login successful');

        const teachersRes = await axios.get('http://127.0.0.1:5197/api/admin/teachers', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Teachers:', JSON.stringify(teachersRes.data, null, 2));

        const classroomsRes = await axios.get('http://127.0.0.1:5197/api/admin/classrooms', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Classrooms:', JSON.stringify(classroomsRes.data, null, 2));
    } catch (err) {
        console.error('Error:', err.response?.status, err.response?.data || err.message);
    }
}

test();
