import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [page, setPage] = useState("home");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/plans`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Plans from backend:", data);

        if (data.success) {
          setPlans(data.plans);
        } else {
          setMessage("Unable to load plans.");
        }
      })
      .catch((error) => {
        console.error("Plans error:", error);
        setMessage("Backend connection failed.");
      });
  }, []);

  useEffect(() => {
    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

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

      if (plan.price === 0) {
        setMessage("Free plan selected successfully!");
        setLoading("");
        return;
      }

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

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to create Razorpay order."
        );
      }

      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "LearnHub",
        description: `${plan.name} Subscription`,
        order_id: data.order.id,

        handler: async function (payment) {
          try {
            const verifyResponse = await fetch(
              `${API_URL}/api/subscription/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: "testuser",
                  razorpay_order_id: payment.razorpay_order_id,
                  razorpay_payment_id: payment.razorpay_payment_id,
                  razorpay_signature: payment.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(
                verifyData.message || "Payment verification failed."
              );
            }

            setMessage(
              `${plan.name} subscription activated successfully!`
            );
          } catch (error) {
            console.error(error);
            setMessage(
              error.message || "Payment verification failed."
            );
          }

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

      setMessage(
        error.message || "Something went wrong."
      );

      setLoading("");
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>LearnHub</h1>

        <nav>
          <button onClick={() => setPage("home")}>
            Home
          </button>

          <button onClick={() => setPage("video")}>
            Video
          </button>

          <button onClick={() => setPage("plans")}>
            Plans
          </button>
        </nav>
      </header>

      {page === "home" && (
        <main className="hero">
          <p>ONLINE LEARNING PLATFORM</p>

          <h2>
            Learn smarter.
            <br />
            Grow faster.
          </h2>

          <p className="hero-text">
            LearnHub is your modern video-learning platform
            for courses, videos and educational content.
          </p>

          <button
            className="hero-button"
            onClick={() => setPage("plans")}
          >
            View Plans
          </button>
        </main>
      )}

      {page === "video" && (
        <main className="video-section">
          <h2>Introduction to Modern Web Development</h2>

          <p>Watch our sample lesson.</p>

          <video
            className="video"
            controls
            preload="metadata"
            src="/video.mp4"
          />
          <button
  onClick={() => {
    const link = document.createElement("a");
    link.href = "/video.mp4";
    link.download = "LearnHub-video.mp4";
    link.click();
  }}
>
  Download Video
</button>
        </main>
      )}

      {page === "plans" && (
        <main className="plans">
          <p className="section-label">
            SUBSCRIPTIONS
          </p>

          <h2>Choose your learning plan</h2>

          <p className="section-description">
            Select a plan to continue with LearnHub.
          </p>

          <div className="plans-container">
            {plans.map((plan) => (
              <div className="plan" key={plan.name}>
                <h3>{plan.name}</h3>

                <div className="price">
                  ₹{plan.price}

                  {plan.price > 0 && (
                    <span>/month</span>
                  )}
                </div>

                <ul>
                  {plan.features?.map((feature) => (
                    <li key={feature}>
                      ✓ {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => buyPlan(plan)}
                  disabled={loading !== ""}
                >
                  {loading === plan.name
                    ? plan.price === 0
                      ? "Selecting..."
                      : "Opening Razorpay..."
                    : plan.price === 0
                    ? "Choose Free"
                    : `Choose ${plan.name}`}
                </button>
              </div>
            ))}
          </div>

          {message && (
            <div className="message">
              {message}
            </div>
          )}
        </main>
      )}

      <footer>
        <h3>LearnHub</h3>
        <p>Modern video-learning platform.</p>
      </footer>
    </div>
  );
}

export default App;