import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./App.css";

const presets = [
  { name: "Classic", qr: "#000000", bg: "#ffffff" },
  { name: "Ocean", qr: "#0369a1", bg: "#e0f2fe" },
  { name: "Forest", qr: "#166534", bg: "#dcfce7" },
  { name: "Sunset", qr: "#c2410c", bg: "#ffedd5" },
  { name: "Purple", qr: "#7e22ce", bg: "#f3e8ff" },
];

function App() {
  const [type, setType] = useState("URL");
  const [text, setText] = useState("");
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiSecurity, setWifiSecurity] = useState("WPA");
  const [error, setError] = useState("");

  const [qrColor, setQrColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("qrHistory")) || [];
    } catch {
      return [];
    }
  });

  const getQRValue = () => {
    if (type === "URL" || type === "Text") {
      return text;
    }

    if (type === "Email") {
      return `mailto:${text}`;
    }

    if (type === "Phone") {
      return `tel:${text}`;
    }

    if (type === "Wi-Fi") {
      return `WIFI:T:${wifiSecurity};S:${wifiName};P:${wifiPassword};;`;
    }

    return "";
  };

  const getDisplayText = () => {
    return type === "Wi-Fi" ? wifiName : text;
  };

  const getLuminance = (hex) => {
    const cleanHex = hex.replace("#", "");

    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const convert = (value) =>
      value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);

    const R = convert(r);
    const G = convert(g);
    const B = convert(b);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  const getContrastRatio = () => {
    const qrLuminance = getLuminance(qrColor);
    const bgLuminance = getLuminance(bgColor);

    const lighter = Math.max(qrLuminance, bgLuminance);
    const darker = Math.min(qrLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  };

  const contrastRatio = getContrastRatio();

  const getContrastMessage = () => {
    if (contrastRatio >= 7) {
      return "Excellent scan reliability";
    }

    if (contrastRatio >= 4.5) {
      return "Good scan reliability";
    }

    return "Low contrast — choose darker QR color or lighter background";
  };

  const validateInput = () => {
    if (type === "URL") {
      if (!text.trim()) {
        return "Please enter a website URL.";
      }

      try {
        const url = new URL(text);

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          return "Please enter a valid HTTP or HTTPS URL.";
        }
      } catch {
        return "Please enter a valid URL, for example https://example.com";
      }
    }

    if (type === "Text") {
      if (!text.trim()) {
        return "Please enter some text.";
      }
    }

    if (type === "Email") {
      if (!text.trim()) {
        return "Please enter an email address.";
      }

      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(text.trim())) {
        return "Please enter a valid email address.";
      }
    }

    if (type === "Phone") {
      if (!text.trim()) {
        return "Please enter a phone number.";
      }

      const phonePattern = /^\+?[0-9\s()-]{7,20}$/;

      if (!phonePattern.test(text.trim())) {
        return "Please enter a valid phone number.";
      }
    }

    if (type === "Wi-Fi") {
      if (!wifiName.trim()) {
        return "Please enter the Wi-Fi network name.";
      }

      if (
        wifiSecurity !== "nopass" &&
        !wifiPassword.trim()
      ) {
        return "Please enter the Wi-Fi password.";
      }
    }

    return "";
  };

  const hasInput =
    type === "Wi-Fi"
      ? wifiName.trim() !== "" &&
        (wifiSecurity === "nopass" ||
          wifiPassword.trim() !== "")
      : text.trim() !== "";

  const inputError = validateInput();

  const isValid =
    hasInput &&
    inputError === "" &&
    contrastRatio >= 4.5;

  const saveToHistory = () => {
    if (!isValid) return;

    const newItem = {
      id: Date.now(),
      type,
      content: getDisplayText(),
      password: type === "Wi-Fi" ? wifiPassword : "",
      security: type === "Wi-Fi" ? wifiSecurity : "",
      qrValue: getQRValue(),
      qrColor,
      bgColor,
    };

    setHistory((currentHistory) => {
      const updatedHistory = [
        newItem,
        ...currentHistory.filter(
          (item) =>
            item.content !== newItem.content ||
            item.type !== newItem.type
        ),
      ].slice(0, 6);

      localStorage.setItem(
        "qrHistory",
        JSON.stringify(updatedHistory)
      );

      return updatedHistory;
    });
  };

  useEffect(() => {
    if (hasInput) {
      setError(inputError);

      if (!inputError && contrastRatio < 4.5) {
        setError(
          "Low color contrast. Please choose colors with better contrast for reliable scanning."
        );
      }

      if (!inputError && contrastRatio >= 4.5) {
        saveToHistory();
      }
    } else {
      setError("");
    }
  }, [
    text,
    wifiName,
    wifiPassword,
    wifiSecurity,
    type,
    qrColor,
    bgColor,
  ]);

  const downloadQR = () => {
    if (inputError) {
      setError(inputError);
      return;
    }

    if (contrastRatio < 4.5) {
      setError(
        "Low color contrast. Please choose colors with better contrast before downloading."
      );
      return;
    }

    const canvas = document.querySelector("#qr-code canvas");

    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "my-qr-code.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const changeType = (newType) => {
    setType(newType);
    setText("");
    setWifiName("");
    setWifiPassword("");
    setWifiSecurity("WPA");
    setError("");
  };

  const applyPreset = (preset) => {
    setQrColor(preset.qr);
    setBgColor(preset.bg);
  };

  const reuseQR = (item) => {
    setType(item.type);
    setQrColor(item.qrColor || "#000000");
    setBgColor(item.bgColor || "#ffffff");
    setError("");

    if (item.type === "Wi-Fi") {
      setWifiName(item.content || "");
      setWifiPassword(item.password || "");
      setWifiSecurity(item.security || "WPA");
    } else {
      setText(item.content || "");
      setWifiName("");
      setWifiPassword("");
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("qrHistory");
  };

  return (
    <div className="app">
      <header>
        <h1>QR Studio</h1>
        <p>Create beautiful QR codes instantly</p>
      </header>

      <main className="container">
        <section className="panel">
          <h2>Create Your QR Code</h2>

          <div className="types">
            {["URL", "Text", "Email", "Phone", "Wi-Fi"].map(
              (item) => (
                <button
                  key={item}
                  className={
                    type === item ? "type active" : "type"
                  }
                  onClick={() => changeType(item)}
                >
                  {item}
                </button>
              )
            )}
          </div>

          {type !== "Wi-Fi" ? (
            <>
              <label>
                {type === "URL" && "Enter website URL"}
                {type === "Text" && "Enter your text"}
                {type === "Email" && "Enter email address"}
                {type === "Phone" && "Enter phone number"}
              </label>

              <textarea
                placeholder={
                  type === "URL"
                    ? "https://example.com"
                    : type === "Text"
                    ? "Hello from QR Studio!"
                    : type === "Email"
                    ? "example@email.com"
                    : "+91 9876543210"
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </>
          ) : (
            <>
              <label>Wi-Fi Network Name</label>

              <input
                className="text-input"
                type="text"
                placeholder="My Wi-Fi"
                value={wifiName}
                onChange={(e) =>
                  setWifiName(e.target.value)
                }
              />

              <label>Wi-Fi Password</label>

              <input
                className="text-input"
                type="password"
                placeholder="Password"
                value={wifiPassword}
                onChange={(e) =>
                  setWifiPassword(e.target.value)
                }
              />

              <label>Security</label>

              <select
                className="text-input"
                value={wifiSecurity}
                onChange={(e) =>
                  setWifiSecurity(e.target.value)
                }
              >
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No Password</option>
              </select>
            </>
          )}

          {error && (
            <p
              style={{
                color: "#dc2626",
                marginBottom: "15px",
                fontWeight: "bold",
              }}
            >
              {error}
            </p>
          )}

          <h3>Quick Presets</h3>

          <div className="presets">
            {presets.map((preset) => (
              <button
                key={preset.name}
                className="preset"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="colors">
            <div>
              <label>QR Color</label>

              <input
                type="color"
                value={qrColor}
                onChange={(e) =>
                  setQrColor(e.target.value)
                }
              />
            </div>

            <div>
              <label>Background</label>

              <input
                type="color"
                value={bgColor}
                onChange={(e) =>
                  setBgColor(e.target.value)
                }
              />
            </div>
          </div>

          <div
            style={{
              marginBottom: "20px",
              padding: "12px",
              borderRadius: "10px",
              background:
                contrastRatio >= 4.5
                  ? "#ecfdf5"
                  : "#fef2f2",
              color:
                contrastRatio >= 4.5
                  ? "#166534"
                  : "#b91c1c",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {getContrastMessage()}
            <br />
            <small>
              Contrast ratio: {contrastRatio.toFixed(2)}:1
            </small>
          </div>

          <button
            onClick={downloadQR}
            disabled={!isValid}
          >
            Download QR Code
          </button>
        </section>

        <section className="preview">
          <h2>Preview</h2>

          <div id="qr-code" className="qr-box">
            {isValid ? (
              <QRCodeCanvas
                value={getQRValue()}
                size={250}
                fgColor={qrColor}
                bgColor={bgColor}
                level="H"
                includeMargin={true}
              />
            ) : (
              <p>
                Enter valid information and use good
                contrast to generate your QR code
              </p>
            )}
          </div>
        </section>
      </main>

      {history.length > 0 && (
        <section className="history">
          <div className="history-header">
            <h2>Recent QR Codes</h2>

            <button onClick={clearHistory}>
              Clear History
            </button>
          </div>

          <div className="history-grid">
            {history.map((item) => (
              <div
                className="history-card"
                key={item.id}
              >
                <QRCodeCanvas
                  value={item.qrValue}
                  size={120}
                  fgColor={item.qrColor}
                  bgColor={item.bgColor}
                  level="H"
                  includeMargin={true}
                />

                <div>
                  <strong>{item.type}</strong>

                  <p>{item.content}</p>

                  <button
                    onClick={() => reuseQR(item)}
                  >
                    Reuse
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;