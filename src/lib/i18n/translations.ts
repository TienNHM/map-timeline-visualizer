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
    calendar: string;
  };
  calendar: {
    prevAria: string;
    nextAria: string;
  };
  heatmap: {
    toggleLabel: string;
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
      calendar: "Lịch",
    },
    calendar: {
      prevAria: "Tháng trước",
      nextAria: "Tháng sau",
    },
    heatmap: {
      toggleLabel: "Bật/tắt bản đồ nhiệt",
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
      calendar: "Calendar",
    },
    calendar: {
      prevAria: "Previous month",
      nextAria: "Next month",
    },
    heatmap: {
      toggleLabel: "Toggle heatmap",
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
