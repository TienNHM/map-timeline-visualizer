export type Locale = "vi" | "en";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "vi", label: "Tiếng Việt" },
  { id: "en", label: "English" },
];

export const DEFAULT_LOCALE: Locale = "vi";

export interface Translations {
  header: {
    titlePrefix: string;
    titleAccent: string;
    titleSuffix: string;
    subtitle: string;
    privacyBadge: string;
    importButton: string;
  };
  upload: {
    title: string;
    subtitle: string;
    privacy: string;
    error: string;
    guideLink: string;
  };
  importGuide: {
    title: string;
    intro: string;
    closeAria: string;
    disclaimer: string;
    tabPhone: string;
    tabTakeout: string;
    phoneSteps: string[];
    takeoutSteps: string[];
  };
  stats: {
    totalDistance: string;
    trips: string;
    placesVisited: string;
    uniquePlaces: string;
    distanceByActivity: string;
    topPlaces: string;
    visit: string;
    visits: string;
  };
  slider: {
    noData: string;
  };
  replay: {
    playAria: string;
    pauseAria: string;
    restartAria: string;
    cameraMenuLabel: string;
    speedMenuLabel: string;
    speedLabel: string;
    fullReplayTakes: string;
  };
  cameraModes: Record<"fixed" | "steady" | "dynamic", { label: string; description: string }>;
  accuracy: {
    label: string;
    hintEnabled: string;
    hintDisabled: string;
  };
  theme: {
    menuLabel: string;
    names: Record<string, string>;
    descriptions: Record<string, string>;
  };
  style: {
    menuLabel: string;
    names: Record<string, string>;
    descriptions: Record<string, string>;
  };
  activities: Record<string, string>;
  places: Record<string, string>;
  locale: {
    menuLabel: string;
  };
  panelTabs: {
    stats: string;
    trips: string;
    places: string;
    calendar: string;
    ai: string;
  };
  calendar: {
    prevAria: string;
    nextAria: string;
  };
  heatmap: {
    toggleLabel: string;
  };
  mapPopup: {
    visits: string;
    timeSpent: string;
    firstVisited: string;
    lastVisited: string;
  };
  placesPanel: {
    title: string;
    sortLabel: string;
    sortVisits: string;
    sortDuration: string;
    sortRecent: string;
    empty: string;
    showMore: string;
    visitsLabel: string;
    timeSpentLabel: string;
    firstVisited: string;
    lastVisited: string;
    viewVisits: string;
    hideVisits: string;
  };
  ai: {
    title: string;
    unavailableTitle: string;
    unavailableBody: string;
    checking: string;
    inputPlaceholder: string;
    sendAria: string;
    suggestionsLabel: string;
    suggestions: string[];
    errorMessage: string;
    thinking: string;
    emptyRangeMessage: string;
  };
  lifeMap: {
    openButton: string;
    titlePrefix: string;
    closeAria: string;
    prevYearAria: string;
    nextYearAria: string;
    distance: string;
    trips: string;
    placesVisited: string;
    uniquePlaces: string;
    travelTime: string;
    topPlaces: string;
    noData: string;
  };
  trips: {
    title: string;
    tripLabel: string;
    distanceLabel: string;
    showMore: string;
    sortLabel: string;
    sortNewest: string;
    sortOldest: string;
    sortDistance: string;
    empty: string;
  };
}

export const TRANSLATIONS: Record<Locale, Translations> = {
  vi: {
    header: {
      titlePrefix: "Bản đồ ",
      titleAccent: "Hành trình",
      titleSuffix: " Trực quan",
      subtitle: "Nhập dữ liệu Google Maps Timeline để xem hành trình, địa điểm và thống kê của bạn.",
      privacyBadge: "100% xử lý cục bộ & riêng tư",
      importButton: "Nhập file khác",
    },
    upload: {
      title: "Kéo thả file xuất Google Maps Timeline vào đây",
      subtitle:
        "hoặc bấm để chọn file JSON — hỗ trợ bản xuất Timeline trên máy, Semantic Location History cũ, hoặc Records.json thô.",
      privacy: "Không có gì rời khỏi thiết bị của bạn — mọi xử lý diễn ra ngay trong trình duyệt",
      error: "Đã đọc file nhưng không tìm thấy dữ liệu vị trí hợp lệ.",
      guideLink: "Chưa biết lấy file này ở đâu? Xem hướng dẫn",
    },
    importGuide: {
      title: "Cách lấy file Dòng thời gian từ Google",
      intro:
        "Tùy vào thời điểm bạn bắt đầu dùng Dòng thời gian (Timeline), dữ liệu của bạn sẽ ở một trong hai chỗ dưới đây — thử cách 1 trước, nếu không thấy tùy chọn đó thì dùng cách 2.",
      closeAria: "Đóng",
      disclaimer:
        "Giao diện của Google có thể thay đổi theo thời gian, thiết bị và khu vực — tên các mục có thể hơi khác một chút so với hướng dẫn này.",
      tabPhone: "Điện thoại (mới nhất)",
      tabTakeout: "Google Takeout (dữ liệu cũ)",
      phoneSteps: [
        "Mở ứng dụng Google Maps trên điện thoại (Android hoặc iOS).",
        "Bấm vào ảnh đại diện của bạn ở góc trên → chọn \"Dữ liệu vị trí\" hoặc \"Dòng thời gian\" (Timeline).",
        "Tìm và bấm \"Xuất dữ liệu Dòng thời gian\" (Export Timeline data).",
        "Lưu file .json — gửi email cho chính mình, lưu vào Drive, hoặc chuyển qua máy tính.",
        "Tải file .json đó lên ô nhập file ở trên.",
      ],
      takeoutSteps: [
        "Truy cập takeout.google.com bằng máy tính, đăng nhập tài khoản Google của bạn.",
        "Bấm \"Bỏ chọn tất cả\", sau đó chỉ tick vào \"Location History (Timeline)\".",
        "Bấm \"Tiếp theo\", giữ định dạng file .zip và kiểu JSON (mặc định).",
        "Bấm \"Tạo export\" — Google sẽ gửi email khi file sẵn sàng (vài phút đến vài giờ).",
        "Giải nén file zip, tìm \"Records.json\" hoặc thư mục \"Semantic Location History\", rồi tải file đó lên đây.",
      ],
    },
    stats: {
      totalDistance: "Tổng quãng đường",
      trips: "Chuyến đi",
      placesVisited: "Lượt ghé thăm",
      uniquePlaces: "Địa điểm khác nhau",
      distanceByActivity: "Quãng đường theo hoạt động",
      topPlaces: "Địa điểm ghé nhiều nhất",
      visit: "lượt",
      visits: "lượt",
    },
    slider: {
      noData: "Không có dữ liệu",
    },
    replay: {
      playAria: "Phát lại hành trình",
      pauseAria: "Tạm dừng",
      restartAria: "Phát lại từ đầu",
      cameraMenuLabel: "Camera",
      speedMenuLabel: "Tốc độ phát",
      speedLabel: "Tốc độ",
      fullReplayTakes: "Toàn bộ hành trình mất khoảng",
    },
    cameraModes: {
      fixed: { label: "Zoom cố định", description: "Camera đứng yên — toàn bộ hành trình luôn trong khung hình." },
      steady: { label: "Bám theo ổn định", description: "Camera dịch chuyển theo marker, giữ nguyên độ zoom." },
      dynamic: { label: "Bám theo linh hoạt", description: "Camera tự zoom và xoay hướng theo tốc độ và chiều di chuyển." },
    },
    accuracy: {
      label: "Giới hạn độ chính xác (mét)",
      hintEnabled: "Loại bỏ tín hiệu GPS có độ chính xác kém hơn mức này.",
      hintDisabled: "Không giới hạn — dùng toàn bộ tín hiệu GPS.",
    },
    theme: {
      menuLabel: "Màu sắc",
      names: {
        violet: "Violet",
        sunset: "Hoàng hôn",
        ocean: "Đại dương",
        forest: "Rừng xanh",
        rose: "Hoa hồng",
        light: "Sáng",
      },
      descriptions: {
        violet: "Tím đậm & xanh ngọc (mặc định)",
        sunset: "Cam ấm & hồng",
        ocean: "Xanh navy đậm & xanh lam",
        forest: "Xanh lá đậm & xanh chanh",
        rose: "Đỏ rượu vang & tím hoa cà",
        light: "Nền bản đồ sáng, chữ tối",
      },
    },
    style: {
      menuLabel: "Phong cách",
      names: {
        gradient: "Gradient",
        brutalism: "Brutalism",
      },
      descriptions: {
        gradient: "Panel kính mờ mềm mại, blur, và gradient (mặc định).",
        brutalism: "Màu phẳng, viền cứng, đổ bóng lệch góc — không blur hay gradient.",
      },
    },
    activities: {
      WALKING: "Đi bộ",
      RUNNING: "Chạy bộ",
      CYCLING: "Đạp xe",
      MOTORCYCLING: "Xe máy",
      IN_PASSENGER_VEHICLE: "Ô tô",
      IN_TAXI: "Taxi",
      IN_BUS: "Xe buýt",
      IN_TRAIN: "Tàu hỏa",
      IN_SUBWAY: "Tàu điện ngầm",
      IN_TRAM: "Tàu điện",
      IN_FERRY: "Phà",
      FLYING: "Máy bay",
      SAILING: "Thuyền buồm",
      SKIING: "Trượt tuyết",
      UNKNOWN: "Khác",
    },
    places: {
      UNKNOWN: "Địa điểm khác",
      HOME: "Nhà",
      INFERRED_HOME: "Nhà",
      WORK: "Cơ quan",
      INFERRED_WORK: "Cơ quan",
      ALIASED_LOCATION: "Địa điểm đã lưu",
      SEARCHED_ADDRESS: "Địa chỉ đã tìm",
    },
    locale: {
      menuLabel: "Ngôn ngữ",
    },
    panelTabs: {
      stats: "Thống kê",
      trips: "Chuyến đi",
      places: "Địa điểm",
      calendar: "Lịch",
      ai: "Trợ lý AI",
    },
    calendar: {
      prevAria: "Tháng trước",
      nextAria: "Tháng sau",
    },
    heatmap: {
      toggleLabel: "Bật/tắt bản đồ nhiệt",
    },
    mapPopup: {
      visits: "lượt ghé",
      timeSpent: "Tổng thời gian",
      firstVisited: "Lần đầu",
      lastVisited: "Lần gần nhất",
    },
    placesPanel: {
      title: "Địa điểm",
      sortLabel: "Sắp xếp",
      sortVisits: "Nhiều lượt ghé nhất",
      sortDuration: "Nhiều thời gian nhất",
      sortRecent: "Ghé gần đây nhất",
      empty: "Không có địa điểm nào trong khoảng thời gian này.",
      showMore: "Xem thêm",
      visitsLabel: "lượt ghé",
      timeSpentLabel: "Tổng thời gian",
      firstVisited: "Lần đầu",
      lastVisited: "Lần gần nhất",
      viewVisits: "Xem các lần ghé",
      hideVisits: "Ẩn danh sách",
    },
    ai: {
      title: "Hỏi về hành trình của bạn",
      unavailableTitle: "Trợ lý AI chưa khả dụng",
      unavailableBody:
        "Tính năng này dùng mô hình AI chạy ngay trên trình duyệt (Chrome/Edge bản mới) — không gửi dữ liệu ra ngoài. Trình duyệt hoặc thiết bị hiện tại chưa hỗ trợ, hoặc mô hình chưa sẵn sàng.",
      checking: "Đang kiểm tra AI cục bộ...",
      inputPlaceholder: "Hỏi điều gì đó về hành trình của bạn...",
      sendAria: "Gửi",
      suggestionsLabel: "Gợi ý",
      suggestions: [
        "Tôi dành phần lớn thời gian ở đâu?",
        "Ngày nào tôi di chuyển nhiều nhất?",
        "Tóm tắt hành trình của tôi",
      ],
      errorMessage: "Không thể tạo câu trả lời. Vui lòng thử lại.",
      thinking: "Đang suy nghĩ...",
      emptyRangeMessage: "Chưa có dữ liệu trong khoảng thời gian đang chọn.",
    },
    lifeMap: {
      openButton: "Hành trình của tôi",
      titlePrefix: "Hành trình năm ",
      closeAria: "Đóng",
      prevYearAria: "Năm trước",
      nextYearAria: "Năm sau",
      distance: "Quãng đường",
      trips: "Chuyến đi",
      placesVisited: "Lượt ghé thăm",
      uniquePlaces: "Địa điểm khác nhau",
      travelTime: "Thời gian di chuyển",
      topPlaces: "Nơi dành nhiều thời gian nhất",
      noData: "Không có dữ liệu cho năm này.",
    },
    trips: {
      title: "Danh sách chuyến đi",
      tripLabel: "Chuyến",
      distanceLabel: "Quãng đường",
      showMore: "Xem thêm",
      sortLabel: "Sắp xếp",
      sortNewest: "Mới nhất",
      sortOldest: "Cũ nhất",
      sortDistance: "Xa nhất",
      empty: "Không có chuyến đi nào trong khoảng thời gian này.",
    },
  },
  en: {
    header: {
      titlePrefix: "Map ",
      titleAccent: "Timeline",
      titleSuffix: " Visualizer",
      subtitle: "Import your Google Maps Timeline export to see journeys, places, and stats.",
      privacyBadge: "100% local & private",
      importButton: "Import a different file",
    },
    upload: {
      title: "Drop your Google Maps Timeline export here",
      subtitle:
        "or click to browse for a JSON file — the on-device Timeline export, legacy Semantic Location History, or raw Records.json all work.",
      privacy: "Nothing leaves your device — parsing happens entirely in your browser",
      error: "Parsed the file but found no usable location data.",
      guideLink: "Not sure where to get this file? See the guide",
    },
    importGuide: {
      title: "How to get your Timeline data from Google",
      intro:
        "Depending on when you started using Timeline, your data lives in one of two places below — try option 1 first, and fall back to option 2 if you don't see that setting.",
      closeAria: "Close",
      disclaimer:
        "Google's interface can change over time, by device, and by region — menu names may differ slightly from this guide.",
      tabPhone: "Phone (latest)",
      tabTakeout: "Google Takeout (older data)",
      phoneSteps: [
        "Open the Google Maps app on your phone (Android or iOS).",
        "Tap your profile picture in the corner → \"Your data in Maps\" or \"Timeline\".",
        "Find and tap \"Export Timeline data\".",
        "Save the .json file — email it to yourself, save to Drive, or transfer it to your computer.",
        "Upload that .json file to the drop zone above.",
      ],
      takeoutSteps: [
        "Go to takeout.google.com on your computer and sign in to your Google account.",
        "Click \"Deselect all\", then check only \"Location History (Timeline)\".",
        "Click \"Next step\", keep the .zip file type and JSON format (the defaults).",
        "Click \"Create export\" — Google will email you when it's ready (a few minutes to a few hours).",
        "Unzip the file, find \"Records.json\" or the \"Semantic Location History\" folder, and upload that here.",
      ],
    },
    stats: {
      totalDistance: "Total distance",
      trips: "Trips",
      placesVisited: "Places visited",
      uniquePlaces: "Unique places",
      distanceByActivity: "Distance by activity",
      topPlaces: "Top places",
      visit: "visit",
      visits: "visits",
    },
    slider: {
      noData: "No data",
    },
    replay: {
      playAria: "Play replay",
      pauseAria: "Pause replay",
      restartAria: "Restart replay",
      cameraMenuLabel: "Camera",
      speedMenuLabel: "Playback speed",
      speedLabel: "speed",
      fullReplayTakes: "Full replay takes ~",
    },
    cameraModes: {
      fixed: { label: "Fixed zoom", description: "Camera stays put — the whole route stays in view." },
      steady: { label: "Steady following", description: "Pans to keep the marker centered at a constant zoom." },
      dynamic: { label: "Dynamic following", description: "Zooms in/out and rotates to match your speed and direction." },
    },
    accuracy: {
      label: "Accuracy limit (meters)",
      hintEnabled: "Drops GPS pings reported less accurate than this.",
      hintDisabled: "No limit — all GPS pings are used.",
    },
    theme: {
      menuLabel: "Theme",
      names: {
        violet: "Violet",
        sunset: "Sunset",
        ocean: "Ocean",
        forest: "Forest",
        rose: "Rose",
        light: "Light",
      },
      descriptions: {
        violet: "Deep violet & teal (default)",
        sunset: "Warm amber & pink",
        ocean: "Deep navy & cyan",
        forest: "Dark green & lime",
        rose: "Wine & orchid",
        light: "Bright basemap, dark text",
      },
    },
    style: {
      menuLabel: "Style",
      names: {
        gradient: "Gradient",
        brutalism: "Brutalism",
      },
      descriptions: {
        gradient: "Soft glass panels, blur, and gradient accents (default).",
        brutalism: "Flat color, hard borders, offset shadows — no blur or gradients.",
      },
    },
    activities: {
      WALKING: "Walking",
      RUNNING: "Running",
      CYCLING: "Cycling",
      MOTORCYCLING: "Motorcycling",
      IN_PASSENGER_VEHICLE: "In Passenger Vehicle",
      IN_TAXI: "In Taxi",
      IN_BUS: "In Bus",
      IN_TRAIN: "In Train",
      IN_SUBWAY: "In Subway",
      IN_TRAM: "In Tram",
      IN_FERRY: "In Ferry",
      FLYING: "Flying",
      SAILING: "Sailing",
      SKIING: "Skiing",
      UNKNOWN: "Other",
    },
    places: {
      UNKNOWN: "Other place",
      HOME: "Home",
      INFERRED_HOME: "Home",
      WORK: "Work",
      INFERRED_WORK: "Work",
      ALIASED_LOCATION: "Saved place",
      SEARCHED_ADDRESS: "Searched address",
    },
    locale: {
      menuLabel: "Language",
    },
    panelTabs: {
      stats: "Stats",
      trips: "Trips",
      places: "Places",
      calendar: "Calendar",
      ai: "AI Assistant",
    },
    calendar: {
      prevAria: "Previous month",
      nextAria: "Next month",
    },
    heatmap: {
      toggleLabel: "Toggle heatmap",
    },
    mapPopup: {
      visits: "visits",
      timeSpent: "Total time",
      firstVisited: "First visited",
      lastVisited: "Last visited",
    },
    placesPanel: {
      title: "Places",
      sortLabel: "Sort by",
      sortVisits: "Most visits",
      sortDuration: "Most time spent",
      sortRecent: "Most recently visited",
      empty: "No places in this date range.",
      showMore: "Show more",
      visitsLabel: "visits",
      timeSpentLabel: "Total time",
      firstVisited: "First visited",
      lastVisited: "Last visited",
      viewVisits: "View visits",
      hideVisits: "Hide visits",
    },
    ai: {
      title: "Ask about your timeline",
      unavailableTitle: "AI assistant unavailable",
      unavailableBody:
        "This feature uses an AI model that runs entirely in your browser (recent Chrome/Edge) — nothing is sent anywhere. Your current browser or device doesn't support it, or the model isn't ready yet.",
      checking: "Checking for on-device AI...",
      inputPlaceholder: "Ask something about your timeline...",
      sendAria: "Send",
      suggestionsLabel: "Suggested",
      suggestions: [
        "Where did I spend most of my time?",
        "Which day did I travel the most?",
        "Summarize my timeline",
      ],
      errorMessage: "Couldn't generate a response. Please try again.",
      thinking: "Thinking...",
      emptyRangeMessage: "No data in the currently selected date range.",
    },
    lifeMap: {
      openButton: "My Life Map",
      titlePrefix: "My ",
      closeAria: "Close",
      prevYearAria: "Previous year",
      nextYearAria: "Next year",
      distance: "Distance",
      trips: "Trips",
      placesVisited: "Places visited",
      uniquePlaces: "Unique places",
      travelTime: "Travel time",
      topPlaces: "Most visited",
      noData: "No data for this year.",
    },
    trips: {
      title: "Trip list",
      tripLabel: "Trip",
      distanceLabel: "Distance",
      showMore: "Show more",
      sortLabel: "Sort by",
      sortNewest: "Newest first",
      sortOldest: "Oldest first",
      sortDistance: "Longest distance",
      empty: "No trips in this date range.",
    },
  },
};

export function isValidLocale(id: string | null | undefined): id is Locale {
  return id === "vi" || id === "en";
}
