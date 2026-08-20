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

  // Buy subscription plan
  async function buyPlan(plan) {
    try {
      setLoading(plan.name);
      setMessage("");

      // Check Razorpay
      if (!window.Razorpay) {
        setMessage(
          "Razorpay is still loading. Please try again."
        );
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

      // Razorpay checkout options
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
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    console.log("Payment verification:", verifyData);

    if (!verifyResponse.ok || !verifyData.success) {
      throw new Error(
        verifyData.message || "Payment verification failed."
      );
    }

    setMessage(
      `${plan.name} subscription activated successfully!`
    );

    setLoading("");
  } catch (error) {
    console.error("Verification error:", error);

    setMessage(
      error.message || "Payment verification failed."
    );

    setLoading("");
  }
},

            // Verify payment with backend
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

            // Verification failed
            if (
              !verifyResponse.ok ||
              !verifyData.success
            ) {
              throw new Error(
                verifyData.message ||
                  "Payment verification failed."
              );
            }

            // Verification successful
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

        // Razorpay window closed
        modal: {
          ondismiss: function () {
            setLoading("");
            setMessage(
              "Payment window closed."
            );
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

      {/* ================= HEADER ================= */}

      <header className="header">
        <h1>LearnHub</h1>

        <nav>
          <a href="#home">Home</a>
          <a href="#plans">Plans</a>
        </nav>
      </header>

      {/* ================= HERO ================= */}

      <section
        className="hero"
        id="home"
      >
        <p>
          ONLINE LEARNING PLATFORM
        </p>

        <h2>
          Learn smarter.
          <br />
          Grow faster.
        </h2>

        <p className="hero-text">
          LearnHub is your modern
          video-learning platform
          for courses, videos and
          educational content.
        </p>

        <a
          href="#plans"
          className="hero-button"
        >
          View Plans
        </a>
      </section>

      {/* ================= VIDEO ================= */}

      <section className="video-section">

        <h2>
          Introduction to Modern Web
          Development
        </h2>

        <p>
          Watch our sample lesson.
        </p>

        <video
          className="video"
          controls
          preload="metadata"
          src="/video.mp4"
        />

      </section>

      {/* ================= PLANS ================= */}

      <section
        className="plans"
        id="plans"
      >

        <p className="section-label">
          SUBSCRIPTIONS
        </p>

        <h2>
          Choose your learning plan
        </h2>

        <p className="section-description">
          Select a plan to continue
          with Razorpay.
        </p>

        <div className="plans-container">

          {plans.map((plan) => (

            <div
              className="plan"
              key={plan.name}
            >

              <h3>
                {plan.name}
              </h3>

              <div className="price">
                ₹{plan.price}
                <span>
                  /month
                </span>
              </div>

              <ul>
                {plan.features.map(
                  (feature) => (
                    <li
                      key={feature}
                    >
                      ✓ {feature}
                    </li>
                  )
                )}
              </ul>

              <button
                onClick={() =>
                  buyPlan(plan)
                }
                disabled={
                  loading !== ""
                }
              >
                {loading ===
                plan.name
                  ? "Opening Razorpay..."
                  : `Choose ${plan.name}`}
              </button>

            </div>

          ))}

        </div>

        {/* PAYMENT MESSAGE */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

      </section>

      {/* ================= FOOTER ================= */}

      <footer>
        <h3>
          LearnHub
        </h3>

        <p>
          Modern video-learning
          platform.
        </p>
      </footer>

    </div>
  );
}

export default App;