const Home = {
  template: `
    <div class="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-6">Login</h2>
      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">Username:</label>
          <input v-model="username" id="username" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required>
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password:</label>
          <input type="password" v-model="password" id="password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required>
        </div>
        <button type="submit" class="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Login</button>
      </form>
    </div>
    `,
  data() {
    return {
      username: "",
      password: "",
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.post(
          "http://localhost:81/api/v1/auth/login",
          {
            username: this.username,
            password: this.password,
          }
        );
        localStorage.setItem("token", response.data.accessToken);
        localStorage.setItem("username", this.username);
        this.$router.push("/chat");
      } catch (error) {
        alert("Login failed");
      }
    },
  },
};

const Chat = {
  template: `
    <div class="max-w-2xl w-full bg-white p-8 rounded-lg shadow-md">
      <h2 class="text-2xl font-bold mb-6">Chat Room</h2>
      <div v-if="!connected" class="text-center text-gray-500">Connecting...</div>
        <div v-else>
          <div class="space-y-4 mb-6 text-black">
            <div v-for="message in messages" :key="message.id" >
              <strong class="text-indigo-600">{{ message.username }}</strong>: {{message.message}} 
            </div>
          </div>
        <form @submit.prevent="sendMessage" class="flex space-x-4">
          <input v-model="newMessage" class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Type a message" required>
          <button type="submit" class="py-2 px-4 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Send</button>
        </form>
      </div>
    </div>
    `,
   data() {
    return {
      messages: [],
      username: '',
      userId: '',
      newMessage: '',
      connected: false,
      socket: null,
    };
  },
  async created() {
    this.connectWebSocket();
    this.getAll();
  },
  methods: {
    async getAll() {
      try {
        const token = localStorage.getItem("token");

        const me = await axios.get(
          "http://localhost:81/api/v1/auth/me",{
            headers: {
              Authorization: `Bearer ${token}`,
            }
          }
        );
        // localStorage.setItem('userId', me.data.id)
        this.username = me.data.username;
        this.userId = me.data.id;
        // console.log(me.data.id)
        const response = await axios.get(
          "http://localhost:81/api/v1/chats?limit=1000"
        );
        this.messages = response.data;
        // this.username = response.data.username;
        console.log(response.data)
      } catch (error) {
        console.error(
          "Error fetching data:",
          error.response ? error.response.data : error.message
        );
      }
    },
    async createMessage(id, message, username) {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:81/api/v1/chats",
        {
          byUserId: id,
          message: message,
          username: username
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      this.messages = response.data;
    },
    async connectWebSocket() {
      const token = localStorage.getItem("token");
      if (!token) {
        this.$router.push("/");
        return;
      }

      this.socket = await io("http://localhost:81", {
        auth: {
          token: `Bearer ${token}`,
        },
        transports: ["websocket"],
      });

      await this.socket.on("connect", () => {
        this.connected = true;
        console.log("Websocket Initialized!");
      });
      this.socket.on("re-message", (message) => {
        this.messages.push(message);
      }); 
      await this.socket.on("disconnect", () => {
        this.connected = false;
      });
    },
    // Extract user info from Token
    async sendMessage() {
      console.log(localStorage.getItem('userId'))

      console.log(this.newMessage, this.username)
      const message = {
        message: this.newMessage,
        username: this.username,
      }; 
      await this.socket.emit("send-message", message);
      this.newMessage = ""; 
    },    
  },
};

const app = Vue.createApp({});

// app.component(Home);
// app.component(Chat);

const routes = [
  { path: "/", component: Home },
  { path: "/chat", component: Chat },
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHistory(),
  routes,
});

app.use(router);
app.mount("#app");
