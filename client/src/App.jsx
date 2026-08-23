import React, { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
 const [page, setPage] = useState("home");
const [plans, setPlans] = useState([]);
const [message, setMessage] = useState("");
const [loading, setLoading] = useState("");
const [activePlan, setActivePlan] = useState("Free");

  // Load plans from backend
  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch(`${API_URL}/api/plans`);
        const data = await response.json();

        console.log("Backend plans:", data);

        if (!response.ok || !data.success) {
          throw new Error("Unable to load plans");
        }

        setPlans(data.plans);
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
        </div>
      </nav>

      {/* HOME */}
      {page === "home" && (
        <main className="video-page">
          <p className="label">
            WELCOME TO LEARNHUB
          </p>

          <h1>
            Learn. Practice. Grow.
          </h1>

          <p className="description">
            Welcome to LearnHub, your online
            learning platform for high-quality
            educational videos.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              setPage("video")
            }
          >
            Start Learning
          </button>
        </main>
      )}

      {/* VIDEO */}
      {page === "video" && (
        <main className="video-page">
          <p className="label">
            FEATURED LESSON
          </p>

          <h1>
            Introduction to Modern Web Development
          </h1>

          <p className="description">
            Watch our sample lesson and explore
            the LearnHub learning experience.
          </p>

          <div className="video-container">
            <video
              controls
              preload="metadata"
              width="100%"
            >
              <source
                src="/video.mp4"
                type="video/mp4"
              />

              Your browser does not support
              the video element.
            </video>

<button
  onClick={() => {
    const plan = localStorage.getItem("selectedPlan") || "Free";

    const limits = {
      Free: 1,
      Bronze: 5,
      Silver: 10,
      Gold: 20,
    };

    const today = new Date().toISOString().split("T")[0];

    const savedDate = localStorage.getItem("downloadDate");
    let downloadCount = Number(
      localStorage.getItem("downloadCount") || 0
    );

    if (savedDate !== today) {
      downloadCount = 0;
      localStorage.setItem("downloadDate", today);
      localStorage.setItem("downloadCount", "0");
    }

    if (downloadCount >= limits[plan]) {
      alert(
        `${plan} plan limit reached. You can download ${limits[plan]} video(s) per day.`
      );
      return;
    }

    const link = document.createElement("a");
    link.href = "/video.mp4";
    link.download = "LearnHub-video.mp4";
    link.click();

    downloadCount += 1;
    localStorage.setItem("downloadCount", String(downloadCount));
  }}
>
  Download Video
</button>

</div>
        </main>
      )}

      {/* PLANS */}
      {page === "plans" && (
        <main className="video-page">

          <p className="label">
            SUBSCRIPTION PLANS
          </p>

          <h1>
            Choose Your Plan
          </h1>

          <p className="description">
            Select a plan that matches your
            learning and download needs.
          </p>

          {/* PLAN CARDS */}
          <div className="plans-container">

            {plans.length === 0 ? (
              <p>
                Loading plans...
              </p>
            ) : (
              plans.map((plan) => (
                <div
                  className="plan-card"
                  key={plan.name}
                >

                  <h2>
                    {plan.name}
                  </h2>

                  <h3>
                    ₹{plan.price}
                    {plan.price > 0 &&
                      "/month"}
                  </h3>

                  <p>
                    {plan.downloadLimit === 1
                      ? "1 video/day"
                      : plan.downloadLimit === 5
                      ? "5 videos/day"
                      : plan.downloadLimit === 10
                      ? "10 videos/day"
                      : plan.downloadLimit === 20
                      ? "20 videos/day"
                      : "Unlimited videos"}
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      choosePlan(plan)
                    }
                    disabled={
                      loading !== ""
                    }
                  >
                    {loading === plan.name
                      ? plan.price === 0
                        ? "Selecting..."
                        : "Opening Razorpay..."
                      : `Choose ${plan.name}`}
                  </button>

                </div>
              ))
            )}

          </div>

          {/* MESSAGE */}
          {message && (
            <div className="message">
              {message}
            </div>
          )}

        </main>
      )}
    </div>
  );
}

export default App;