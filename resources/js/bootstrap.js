// import axios from 'axios';
// window.axios = axios;
//
// window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// важно для Laravel CSRF
window.axios.defaults.withCredentials = true;
window.axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
window.axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
window.axios.defaults.withXSRFToken = true; // axios >=1.6

// резерв из <meta>, если cookie еще нет
const meta = document.querySelector('meta[name="csrf-token"]')?.content;
if (meta) window.axios.defaults.headers.common['X-CSRF-TOKEN'] = meta;
