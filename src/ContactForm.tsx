import { useState } from "react";
import { useToast } from "./ToastContext";

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const { addToast } = useToast();

  const validateName = (value: string): string | undefined => {
    if (value.length < 2) {
      return "Name must be at least 2 characters";
    }
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const validateMessage = (value: string): string | undefined => {
    if (value.length < 10) {
      return "Message must be at least 10 characters";
    }
    return undefined;
  };

  const validateForm = (): FormErrors => {
    return {
      name: validateName(name),
      email: validateEmail(email),
      message: validateMessage(message),
    };
  };

  const isFormValid = (): boolean => {
    const formErrors = validateForm();
    return !formErrors.name && !formErrors.email && !formErrors.message;
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const formErrors = validateForm();
    setErrors(formErrors);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (touched.name) {
      setErrors({ ...errors, name: validateName(value) });
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      setErrors({ ...errors, email: validateEmail(value) });
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    if (touched.message) {
      setErrors({ ...errors, message: validateMessage(value) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
      setTouched({});
      setErrors({});
      addToast("Message sent successfully!", "success");
    }
  };

  if (submitted) {
    return (
      <div className="contact-form" data-testid="contact-form">
        <h3>Contact Us</h3>
        <div className="contact-success" data-testid="contact-success">
          Thank you for your message! We'll get back to you soon.
        </div>
        <button
          data-testid="contact-new-btn"
          className="contact-new-btn"
          onClick={() => setSubmitted(false)}
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="contact-form" data-testid="contact-form">
      <h3>Contact Us</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="contact-name">Name</label>
          <input
            type="text"
            id="contact-name"
            data-testid="contact-name-input"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={() => handleBlur("name")}
            placeholder="Your name"
          />
          {touched.name && errors.name && (
            <span className="form-error" data-testid="contact-name-error">
              {errors.name}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="contact-email">Email</label>
          <input
            type="email"
            id="contact-email"
            data-testid="contact-email-input"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={() => handleBlur("email")}
            placeholder="your.email@example.com"
          />
          {touched.email && errors.email && (
            <span className="form-error" data-testid="contact-email-error">
              {errors.email}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            data-testid="contact-message-input"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onBlur={() => handleBlur("message")}
            placeholder="Your message (at least 10 characters)"
            rows={4}
          />
          {touched.message && errors.message && (
            <span className="form-error" data-testid="contact-message-error">
              {errors.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          data-testid="contact-submit-btn"
          disabled={!isFormValid()}
        >
          Send Message
        </button>
      </form>
    </div>
  );
}

export default ContactForm;
