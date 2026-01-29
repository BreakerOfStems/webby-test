import ContactForm from "./ContactForm";
import Counter from "./Counter";
import Footer from "./Footer";
import Header from "./Header";
import TodoList from "./TodoList";

function App() {
  return (
    <div className="app-container">
      <Header />
      <div className="app-content">
        <div className="app">
          <header>
            <h1>Webby Test</h1>
            <p>A simple React application for testing the Claude GitHub Runner.</p>
          </header>
          <main>
            <p>Welcome! This app will be expanded with new features.</p>
            <Counter />
            <TodoList />
            <ContactForm />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default App;
