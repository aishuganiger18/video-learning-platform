import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

const COURSES = [
  {
    id: "video-001",
    title: "Introduction to Programming",
    category: "Programming",
    level: "Beginner",
    premium: false,
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "video-002",
    title: "Data Structures and Algorithms",
    category: "Computer Science",
    level: "Intermediate",
    premium: true,
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "video-003",
    title: "Web Development Fundamentals",
    category: "Web Development",
    level: "Beginner",
    premium: true,
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "video-004",
    title: "Advanced JavaScript",
    category: "Programming",
    level: "Advanced",
    premium: true,
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
];

function App() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [watchedMinutes, setWatchedMinutes] = useState(0);
  const [watching, setWatching] = useState(false);

  const userId = "demo-user-001";

  // ================= LOAD PLANS =================

  useEffect(() => {
    fetch(`${API_URL}/api/plans`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load plans");
        }

        return response.json();
      })
      .then((data) => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load plans. Please check the backend.");
        setLoading(false);
      });
  }, []);

  // ================= PLAN SELECTION =================

  const handlePlanSelect = (planName) => {
    setSelectedPlan(planName);
    setMessage(`${planName} plan selected successfully.`);
  };

  // ================= DOWNLOAD =================

  const handleDownload = async (course) => {
    if (!selectedPlan) {
      setMessage("Please select a subscription plan first.");
      return;
    }

    const selectedPlanData = plans.find(
      (plan) => plan.name === selectedPlan
    );

    if (!selectedPlanData) {
      setMessage("Selected plan information is not available.");
      return;
    }

    if (course.premium && !selectedPlanData.premiumVideos) {
      setMessage(`${course.title} requires a premium subscription.`);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          plan: selectedPlan,
          videoId: course.id,
          videoTitle: course.title,
          fileSize: 0,
          thumbnail: "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Download failed.");
        return;
      }

      setMessage(
        `${course.title} downloaded successfully. Remaining: ${data.remaining}`
      );
    } catch (err) {
      console.error(err);
      setMessage("Unable to connect to the backend.");
    }
  };

  // ================= RECORD WATCH TIME =================

  const recordWatchTime = async (minutes) => {
    if (
      !selectedCourse ||
      !selectedPlan ||
      minutes <= 0
    ) {
      return;
    }

    const selectedPlanData = plans.find(
      (plan) => plan.name === selectedPlan
    );

    if (!selectedPlanData) {
      return;
    }

    const remaining = Math.max(
      selectedPlanData.watchTime - watchedMinutes,
      0
    );

    if (remaining <= 0) {
      setMessage(
        `${selectedPlan} plan watch-time limit reached.`
      );

      setWatching(false);
      return;
    }

    const minutesToSend = Math.min(minutes, remaining);

    try {
      console.log("Sending watch time:", {
        userId,
        plan: selectedPlan,
        videoId: selectedCourse.id,
        minutes: minutesToSend,
      });

      const response = await fetch(`${API_URL}/api/watch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          plan: selectedPlan,
          videoId: selectedCourse.id,
          minutes: minutesToSend,
        }),
      });

      const data = await response.json();

      console.log("WATCH RESPONSE:", data);

      if (!response.ok) {
        setMessage(
          data.message || "Watch-time limit reached."
        );

        setWatching(false);
        return;
      }

      setWatchedMinutes(Number(data.watched) || 0);

      setMessage(
        `Watching ${selectedCourse.title} • ${data.remaining} minutes remaining`
      );

      if (data.remaining <= 0) {
        setWatching(false);

        setMessage(
          `${selectedPlan} plan watch-time limit reached.`
        );
      }
    } catch (err) {
      console.error("WATCH TIME ERROR:", err);

      setMessage("Unable to record watch time.");
    }
  };

  // ================= AUTOMATIC WATCH-TIME TRACKING =================

  useEffect(() => {
    if (
      !watching ||
      !selectedCourse ||
      !selectedPlan
    ) {
      return;
    }

    const timer = setInterval(() => {
      recordWatchTime(1);
    }, 60000);

    return () => {
      clearInterval(timer);
    };
  }, [
    watching,
    selectedCourse,
    selectedPlan,
    watchedMinutes,
  ]);

  // ================= WATCH COURSE =================

  const handleWatch = (course) => {
    if (!selectedPlan) {
      setMessage("Please select a subscription plan first.");
      return;
    }

    const selectedPlanData = plans.find(
      (plan) => plan.name === selectedPlan
    );

    if (!selectedPlanData) {
      setMessage(
        "Selected plan information is not available."
      );
      return;
    }

    if (
      course.premium &&
      !selectedPlanData.premiumVideos
    ) {
      setMessage(
        `${course.title} requires a premium subscription.`
      );
      return;
    }

    const remaining = Math.max(
      selectedPlanData.watchTime - watchedMinutes,
      0
    );

    if (remaining <= 0) {
      setMessage(
        `${selectedPlan} plan watch-time limit reached.`
      );
      return;
    }

    setSelectedCourse(course);
    setMessage("");
  };

  // ================= CLOSE VIDEO =================

  const handleCloseVideo = () => {
    setWatching(false);
    setSelectedCourse(null);
  };

  // ================= VIDEO ENDED =================

  const handleVideoEnded = async () => {
    console.log("VIDEO ENDED - recording 1 minute");

    setWatching(false);

    // The test video is only 5 seconds long.
    // The backend records watch time in minutes,
    // so send 1 minute when the test video finishes.
    await recordWatchTime(1);
  };

  // ================= UI =================

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="hero">
        <h1>LEARNHUB</h1>
        <h2>Video Learning Platform</h2>
        <p>Learn. Watch. Grow.</p>
      </header>

      <main>

        {/* ================= PLANS ================= */}

        <h2 className="choose-title">
          Choose Your Plan
        </h2>

        {loading && (
          <p className="status">
            Loading plans...
          </p>
        )}

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="plans-container">

            {plans.map((plan) => {
              const isSelected =
                selectedPlan === plan.name;

              return (
                <div
                  className={`plan-card ${
                    isSelected ? "selected" : ""
                  }`}
                  key={plan.name}
                >

                  <h3>{plan.name}</h3>

                  <div className="price">
                    ₹{plan.price}
                  </div>

                  <p>
                    <strong>
                      Video Quality:
                    </strong>{" "}
                    {plan.videoQuality}
                  </p>

                  <p>
                    <strong>
                      Watch Time:
                    </strong>{" "}
                    {plan.watchTime} minutes
                  </p>

                  <p>
                    <strong>
                      Downloads:
                    </strong>{" "}
                    {plan.downloadLimit} per day
                  </p>

                  <p>
                    <strong>
                      Validity:
                    </strong>{" "}
                    {plan.validityDays
                      ? `${plan.validityDays} days`
                      : "Free"}
                  </p>

                  <p>
                    <strong>
                      Ads:
                    </strong>{" "}
                    {plan.ads
                      ? "Supported"
                      : "No Ads"}
                  </p>

                  <p>
                    <strong>
                      Offline Downloads:
                    </strong>{" "}
                    {plan.offlineDownloads
                      ? "Yes"
                      : "No"}
                  </p>

                  <ul>
                    {(plan.features || []).map(
                      (feature, index) => (
                        <li key={index}>
                          {feature}
                        </li>
                      )
                    )}
                  </ul>

                  <label className="select-plan">

                    <input
                      type="radio"
                      name="subscription"
                      value={plan.name}
                      checked={isSelected}
                      onChange={() =>
                        handlePlanSelect(plan.name)
                      }
                    />

                    <span>
                      {isSelected
                        ? `Selected ${plan.name}`
                        : `Select ${plan.name}`}
                    </span>

                  </label>

                </div>
              );
            })}

          </div>
        )}

        {/* ================= SELECTED PLAN ================= */}

        {selectedPlan && (
          <p className="status">
            Selected Plan:{" "}
            <strong>
              {selectedPlan}
            </strong>
          </p>
        )}

        {/* ================= MESSAGE ================= */}

        {message && (
          <p className="status">
            {message}
          </p>
        )}

        {/* ================= VIDEO PLAYER ================= */}

        {selectedCourse && (
          <section className="video-player-section">

            <h2 className="choose-title">
              ▶ Now Watching
            </h2>

            <h3>
              {selectedCourse.title}
            </h3>

            {(() => {
              const selectedPlanData =
                plans.find(
                  (plan) =>
                    plan.name === selectedPlan
                );

              const remainingMinutes =
                selectedPlanData
                  ? Math.max(
                      selectedPlanData.watchTime -
                        watchedMinutes,
                      0
                    )
                  : 0;

              return (
                <>
                  <p className="status">
                    Watch time remaining:{" "}
                    <strong>
                      {remainingMinutes} minutes
                    </strong>
                  </p>

                  {remainingMinutes > 0 ? (
                    <video
                      controls
                      width="800"
                      src={selectedCourse.videoUrl}

                      onPlay={() => {
                        setWatching(true);

                        setMessage(
                          "Video is playing..."
                        );
                      }}

                      onPause={() => {
                        setWatching(false);
                      }}

                      onEnded={handleVideoEnded}
                    >
                      Your browser does not
                      support the video player.
                    </video>
                  ) : (
                    <p className="error">
                      Your watch-time limit
                      has been reached.
                    </p>
                  )}

                  <br />

                  <button
                    className="download-btn"
                    onClick={handleCloseVideo}
                  >
                    Close Video
                  </button>
                </>
              );
            })()}

          </section>
        )}

        {/* ================= COURSES ================= */}

        <section className="courses-section">

          <h2 className="choose-title">
            Available Courses
          </h2>

          <p className="course-subtitle">
            Choose a course and start learning.
          </p>

          <div className="courses-container">

            {COURSES.map((course) => {

              const selectedPlanData =
                plans.find(
                  (plan) =>
                    plan.name === selectedPlan
                );

              const locked =
                course.premium &&
                (!selectedPlanData ||
                  !selectedPlanData.premiumVideos);

              return (
                <div
                  className={`course-card ${
                    locked ? "locked" : ""
                  }`}
                  key={course.id}
                >

                  <div className="course-icon">
                    🎥
                  </div>

                  <h3>
                    {course.title}
                  </h3>

                  <p>
                    <strong>
                      Category:
                    </strong>{" "}
                    {course.category}
                  </p>

                  <p>
                    <strong>
                      Level:
                    </strong>{" "}
                    {course.level}
                  </p>

                  <p>
                    <strong>
                      Access:
                    </strong>{" "}
                    {course.premium
                      ? "Premium"
                      : "Free"}
                  </p>

                  {/* ================= LOCKED ================= */}

                  {locked && (
                    <p className="locked-text">
                      🔒 Premium plan required
                    </p>
                  )}

                  {/* ================= WATCH + DOWNLOAD ================= */}

                  {!locked && (
                    <>
                      <button
                        className="download-btn"
                        onClick={() =>
                          handleWatch(course)
                        }
                      >
                        ▶ Watch
                      </button>

                      <button
                        className="download-btn"
                        onClick={() =>
                          handleDownload(course)
                        }
                      >
                        Download
                      </button>
                    </>
                  )}

                  {/* ================= UPGRADE ================= */}

                  {locked && (
                    <button
                      className="download-btn"
                      onClick={() =>
                        setMessage(
                          "Please select a premium plan to access this course."
                        )
                      }
                    >
                      Upgrade Plan
                    </button>
                  )}

                </div>
              );
            })}

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;