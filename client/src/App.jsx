import React, { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
 const [page, setPage] = useState("home");
const [plans, setPlans] = useState([]);
const [message, setMessage] = useState("");
const [loading, setLoading] = useState("");
const [activePlan, setActivePlan] = useState(
  localStorage.getItem("activePlan") || "Free"
);
const [comment, setComment] = useState("");

// Load plans from backend
  useEffect(() => {
    async function loadPlans() {
      try {
       const response = await fetch("http://localhost:5000/api/plans");
        const data = await response.json();

        console.log("Backend plans:", data);

        if (!response.ok || !data.success) {
          throw new Error("Unable to load plans");
        }

       const uniquePlans = Array.from(
  new Map(data.plans.map((plan) => [plan.name, plan])).values()
);

setPlans(uniquePlans);
      } catch (error) {
        console.error("Plans error:", error);
        setMessage("Backend connection failed.");
      }
    }

    loadPlans();
  }, []);

  // Load Razorpay
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

  // Select / purchase plan
  async function choosePlan(plan) {
    try {
      setLoading(plan.name);
      setMessage("");

      // Save selected plan
      localStorage.setItem("selectedPlan", plan.name);
      // FREE PLAN
      if (plan.price === 0) {
        setMessage("Free plan selected successfully!");
        setLoading("");
        return;
      }

      // Check Razorpay
      if (!window.Razorpay) {
        setMessage("Razorpay is still loading. Please try again.");
        setLoading("");
        return;
      }

      // Create Razorpay order
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

      console.log("Razorpay order:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to create Razorpay order."
        );
      }

      // Razorpay options
      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,

        name: "LearnHub",
        description: `${plan.name} Subscription`,

        order_id: data.order.id,

        // PAYMENT SUCCESS
        handler: async function (payment) {
          try {
            console.log("Payment successful:", payment);

            const verifyResponse = await fetch(
              `${API_URL}/api/subscription/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: "testuser",
                  razorpay_order_id:
                    payment.razorpay_order_id,
                  razorpay_payment_id:
                    payment.razorpay_payment_id,
                  razorpay_signature:
                    payment.razorpay_signature,
                }),
              }
            );

            const verifyData =
              await verifyResponse.json();

            console.log(
              "Payment verification:",
              verifyData
            );

            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              throw new Error(
                verifyData.message ||
                  "Payment verification failed."
              );
            }
setActivePlan(plan.name);
localStorage.setItem("activePlan", plan.name);
            setMessage(
              `${plan.name} subscription activated successfully!`
            );

            setLoading("");
          } catch (error) {
            console.error(
              "Verification error:",
              error
            );

            setMessage(
              error.message ||
                "Payment verification failed."
            );

            setLoading("");
          }
        },

        // PAYMENT WINDOW CLOSED
        modal: {
          ondismiss: function () {
            setLoading("");
            setMessage("Payment window closed.");
          },
        },

        // Razorpay theme
        theme: {
          color: "#6366f1",
        },
      };

      // Create Razorpay instance
      const razorpay =
        new window.Razorpay(options);

      // PAYMENT FAILED
      razorpay.on(
        "payment.failed",
        function (response) {
          console.error(
            "Payment failed:",
            response
          );

          setMessage(
            response.error?.description ||
              "Payment failed. Please try again."
          );

          setLoading("");
        }
      );

      // Open Razorpay
      razorpay.open();
    } catch (error) {
      console.error(
        "Payment error:",
        error
      );

      setMessage(
        error.message ||
          "Something went wrong."
      );

      setLoading("");
    }
  }

  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          Learn<span>Hub</span>
        </div>

        <div className="nav-links">
          <button
            onClick={() => setPage("home")}
          >
            Home
          </button>

          <button
            onClick={() => setPage("video")}
          >
            Video
          </button>

          <button
  onClick={() => setPage("plans")}
>
  Plans
</button>

<button
  onClick={() => setPage("downloads")}
>
  Downloads
</button>
</div>
</nav>
      {/* HOME */}
      {page === "home" && (
        <main className="video-page">
          <p className="label">WELCOME TO LEARNHUB</p>

          <h1>Learn. Practice. Grow.</h1>

          <p className="description">
            Welcome to LearnHub, your online learning platform for high-quality
            educational videos.
          </p>

          <button
            className="primary-button"
            onClick={() => setPage("video")}
          >
            Start Learning
          </button>
        </main>
      )}

      {/* VIDEO */}
      {page === "video" && (
        <main className="video-page">
          <p className="label">FEATURED LESSON</p>

          <h1>Introduction to Modern Web Development</h1>

          <p className="description">
            Watch our sample lesson and explore the LearnHub learning experience.
          </p>

          <div className="video-container">
            <video controls preload="metadata" width="100%">
              <source src="/video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </main>
      )}

      {/* PLANS */}
      {page === "plans" && (
        <main className="plans-page">
          <h1>Choose Your Plan</h1>

          {plans.map((plan) => (
            <div className="plan-card" key={plan.name}>
              <h2>{plan.name}</h2>
              <p>₹{plan.price}</p>

              <button
                onClick={() => choosePlan(plan)}
                disabled={loading === plan.name}
              >
                {loading === plan.name ? "Processing..." : "Choose Plan"}
              </button>
            </div>
          ))}

          {message && <p>{message}</p>}
        </main>
      )}

      {/* DOWNLOADS */}
      {page === "downloads" && (
        <main className="video-page">
          <p className="label">DOWNLOADS</p>
          <h1>Your Downloads</h1>
          <p className="description">
            Your downloaded learning materials will appear here.
          </p>
        </main>
      )}

    </div>
  );
}

export default App;