import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

const plans = [
  {
    name: "Bronze",
    price: 199,
    features: [
      "Basic video access",
      "1 download per day",
      "Standard video quality",
    ],
  },
  {
    name: "Silver",
    price: 399,
    features: [
      "Standard video access",
      "5 downloads per day",
      "HD video quality",
    ],
  },
  {
    name: "Gold",
    price: 699,
    features: [
      "All video access",
      "10 downloads per day",
      "Full HD video quality",
      "Premium content",
    ],
  },
];

function App() {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      console.log("Razorpay loaded");
    };

    script.onerror = () => {
      console.error("Razorpay failed to load");
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  async function buyPlan(plan) {
    try {
      setLoading(plan.name);
      setMessage("");

      if (!window.Razorpay) {
        setMessage("Razorpay is still loading. Please try again.");
        setLoading("");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/subscription/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "testuser",
            plan: plan.name,
          }),
        }
      );

      const data = await response.json();

      console.log("Razorpay response:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to create Razorpay order"
        );
      }

      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "LearnHub",
        description: `${plan.name} Subscription`,
        order_id: data.order.id,

        handler: function (payment) {
          console.log("Payment successful:", payment);

          setMessage(
            `${plan.name} payment successful! Payment ID: ${payment.razorpay_payment_id}`
          );

          setLoading("");
        },

        modal: {
          ondismiss: function () {
            setLoading("");
            setMessage("Payment window closed.");
          },
        },

        theme: {
          color: "#6366f1",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        console.error("Payment failed:", response);

        setMessage(
          response.error?.description ||
            "Payment failed. Please try again."
        );

        setLoading("");
      });

      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);

      setMessage(error.message || "Something went wrong.");

      setLoading("");
    }
  }

  return (
    <div className="app">

      {/* NAVBAR */}
      <header className="header">
        <div className="logo">
          Learn<span>Hub</span>
        </div>

        <nav>
          <a href="#home">Home</a>
          <a href="#video">Video</a>
          <a href="#plans">Plans</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-content">

          <p className="eyebrow">
            ONLINE LEARNING PLATFORM
          </p>

          <h1>
            Learn smarter.
            <br />
            <span>Grow faster.</span>
          </h1>

          <p className="hero-text">
            LearnHub is your modern video-learning platform
            for courses, videos and educational content.
          </p>

          <a href="#plans" className="hero-button">
            View Learning Plans
          </a>

        </div>
      </section>

      {/* VIDEO */}
      <section className="video-section" id="video">

        <p className="section-label">
          FEATURED LESSON
        </p>

        <h2>
          Introduction to Modern Web Development
        </h2>

        <p className="video-description">
          Watch our sample lesson and explore the LearnHub
          learning experience.
        </p>

        <video
          className="video"
          controls
          preload="metadata"
          src="/video.mp4"
        />

      </section>

      {/* SUBSCRIPTIONS */}
      <section className="plans-section" id="plans">

        <p className="section-label">
          SUBSCRIPTIONS
        </p>

        <h2>
          Choose your learning plan
        </h2>

        <p className="section-description">
          Select the plan that fits your learning needs.
        </p>

        <div className="plans-container">

          {plans.map((plan) => (
            <div
              className={`plan-card ${plan.name.toLowerCase()}`}
              key={plan.name}
            >

              <div className="plan-top">
                <h3>{plan.name}</h3>

                <div className="price">
                  ₹{plan.price}
                  <span>/month</span>
                </div>
              </div>

              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="check">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className="plan-button"
                onClick={() => buyPlan(plan)}
                disabled={loading !== ""}
              >
                {loading === plan.name
                  ? "Opening Razorpay..."
                  : `Choose ${plan.name}`}
              </button>

            </div>
          ))}

        </div>

        {message && (
          <div className="payment-message">
            {message}
          </div>
        )}

      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">
          Learn<span>Hub</span>
        </div>

        <p>
          Modern video-learning platform.
        </p>
      </footer>

    </div>
  );
}

export default App;