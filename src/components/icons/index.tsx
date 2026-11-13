import { forwardRef, type ComponentType, type ReactNode } from "react";
import {
  Add,
  AddCircle,
  Airplane,
  ArrowDown as IxArrowDown,
  ArrowDown2,
  ArrowLeft as IxArrowLeft,
  ArrowLeft2,
  ArrowRight as IxArrowRight,
  ArrowRight2,
  ArrowSwapVertical,
  ArrowUp2,
  Award as IxAward,
  Book,
  Book1,
  Briefcase as IxBriefcase,
  Brush,
  Building,
  Buildings2,
  Calendar as IxCalendar,
  Calendar1,
  Call,
  CallSlash,
  Camera as IxCamera,
  Car as IxCar,
  Card,
  Chart,
  ClipboardText,
  ClipboardTick,
  Clock as IxClock,
  CloseCircle,
  Cloud as IxCloud,
  Code as IxCode,
  Coffee as IxCoffee,
  ColorSwatch,
  Copy as IxCopy,
  Cpu as IxCpu,
  Crown1,
  Cup,
  Danger,
  Data,
  Diamonds,
  DocumentUpload,
  DollarCircle,
  Edit as IxEdit,
  Edit2,
  EmojiHappy,
  Export,
  ExportSquare,
  Eye as IxEye,
  EyeSlash,
  Facebook as IxFacebook,
  Filter as IxFilter,
  Flash,
  Gallery,
  Game,
  Global,
  Happyemoji,
  Health,
  Heart as IxHeart,
  Hierarchy,
  Home2,
  Import,
  InfoCircle,
  Judge,
  LampOn,
  LanguageSquare,
  Like1,
  Link as IxLink,
  Link2 as IxLink2,
  Location,
  Lock as IxLock,
  Logout,
  MagicStar,
  Message,
  MessageText,
  Microphone2,
  Microscope,
  Mobile,
  Money,
  Monitor as IxMonitor,
  Moon as IxMoon,
  More,
  Music as IxMusic,
  Notification,
  PenTool as IxPenTool,
  People,
  Play as IxPlay,
  ProfileCircle,
  Radar,
  Refresh,
  Reserve,
  RotateLeft,
  Ruler,
  SearchNormal1,
  Setting2,
  Setting4,
  Shield as IxShield,
  Ship as IxShip,
  ShoppingCart as IxShoppingCart,
  SidebarLeft,
  Sms,
  Star1,
  StatusUp,
  Tag as IxTag,
  Teacher,
  Text,
  TickCircle,
  Timer1,
  Trash,
  TrendUp,
  Truck as IxTruck,
  User as IxUser,
  UserAdd,
  Video as IxVideo,
  VolumeHigh,
  VolumeSlash,
  Wallet,
  Weight,
  type Icon as IconsaxIcon,
  type IconProps as IconsaxProps,
} from "iconsax-react";

import { cn } from "@/lib/utils";

export { Bookmark, Send, Share, Share2, Sun } from "lucide-react";

export type IconProps = Omit<IconsaxProps, "ref"> & {
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
};

export type IconComponent = ComponentType<IconProps>;

const FILL_CLASS = /(^|\s|:)fill-(?!none(\s|$))/;

const fromIconsax = (Source: IconsaxIcon, name: string) => {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>(
    (
      {
        fill,
        strokeWidth: _s,
        absoluteStrokeWidth: _a,
        variant,
        color,
        className,
        ...props
      },
      ref,
    ) => {
      const filled =
        (fill !== undefined && fill !== "none") ||
        (className !== undefined && FILL_CLASS.test(className));
      const fillColor =
        fill && fill !== "none" && fill !== "currentColor" ? fill : undefined;
      return (
        <Source
          ref={ref}
          variant={variant ?? (filled ? "Bold" : "Linear")}
          color={color ?? fillColor ?? "currentColor"}
          className={cn("breneo-icon", className)}
          {...props}
        />
      );
    },
  );
  Wrapped.displayName = name;
  return Wrapped;
};

/** Shapes Iconsax lacks, drawn in its style: round caps and joins. */
const custom = (name: string, children: ReactNode) => {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>(
    (
      {
        size = 24,
        color = "currentColor",
        strokeWidth: _s,
        absoluteStrokeWidth: _a,
        variant: _v,
        className,
        ...props
      },
      ref,
    ) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("breneo-icon", className)}
        {...props}
      >
        {children}
      </svg>
    ),
  );
  Wrapped.displayName = name;
  return Wrapped;
};

export const Check = custom("Check", <path d="M5 12.75l4.25 4.25L19 7.25" />);
export const X = custom("X", <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />);
export const Circle = custom("Circle", <circle cx="12" cy="12" r="9" />);
export const Dot = custom(
  "Dot",
  <circle cx="12" cy="12" r="1.5" fill="currentColor" />,
);
export const Square = custom(
  "Square",
  <rect x="4" y="4" width="16" height="16" rx="4" />,
);
export const GripVertical = custom(
  "GripVertical",
  <>
    <circle cx="9" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="18" r="1" />
  </>,
);
export const MoreVertical = custom(
  "MoreVertical",
  <>
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="19" r="1" />
  </>,
);
export const ArrowUpRight = custom(
  "ArrowUpRight",
  <path d="M7 17L17 7M8.5 7H17v8.5" />,
);
export const Loader2 = custom(
  "Loader2",
  <path d="M21 12a9 9 0 1 1-6.22-8.56" />,
);
export const Linkedin = custom(
  "Linkedin",
  <>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" rx="1" />
    <circle cx="4" cy="4" r="2" />
  </>,
);

export const AlertCircle = fromIconsax(InfoCircle, "AlertCircle");
export const AlertTriangle = fromIconsax(Danger, "AlertTriangle");
export const ArrowDown = fromIconsax(IxArrowDown, "ArrowDown");
export const ArrowLeft = fromIconsax(IxArrowLeft, "ArrowLeft");
export const ArrowRight = fromIconsax(IxArrowRight, "ArrowRight");
export const Atom = fromIconsax(Microscope, "Atom");
export const Award = fromIconsax(IxAward, "Award");
export const Banknote = fromIconsax(Money, "Banknote");
export const BarChart3 = fromIconsax(Chart, "BarChart3");
export const Bell = fromIconsax(Notification, "Bell");
export const BellOff = fromIconsax(Notification, "BellOff");
export const BookOpen = fromIconsax(Book1, "BookOpen");
export const Brain = fromIconsax(MagicStar, "Brain");
export const Briefcase = fromIconsax(IxBriefcase, "Briefcase");
export const Building2 = fromIconsax(Building, "Building2");
export const Calendar = fromIconsax(IxCalendar, "Calendar");
export const CalendarDays = fromIconsax(Calendar1, "CalendarDays");
export const Camera = fromIconsax(IxCamera, "Camera");
export const Car = fromIconsax(IxCar, "Car");
export const CheckCircle = fromIconsax(TickCircle, "CheckCircle");
export const CheckCircle2 = fromIconsax(TickCircle, "CheckCircle2");
export const ChevronDown = fromIconsax(ArrowDown2, "ChevronDown");
export const ChevronLeft = fromIconsax(ArrowLeft2, "ChevronLeft");
export const ChevronRight = fromIconsax(ArrowRight2, "ChevronRight");
export const ChevronUp = fromIconsax(ArrowUp2, "ChevronUp");
export const ChevronsUpDown = fromIconsax(ArrowSwapVertical, "ChevronsUpDown");
export const CircleUserRound = fromIconsax(ProfileCircle, "CircleUserRound");
export const ClipboardCheck = fromIconsax(ClipboardTick, "ClipboardCheck");
export const ClipboardList = fromIconsax(ClipboardText, "ClipboardList");
export const Clock = fromIconsax(IxClock, "Clock");
export const Cloud = fromIconsax(IxCloud, "Cloud");
export const Code = fromIconsax(IxCode, "Code");
export const Coffee = fromIconsax(IxCoffee, "Coffee");
export const Copy = fromIconsax(IxCopy, "Copy");
export const Cpu = fromIconsax(IxCpu, "Cpu");
export const CreditCard = fromIconsax(Card, "CreditCard");
export const Crown = fromIconsax(Crown1, "Crown");
export const Database = fromIconsax(Data, "Database");
export const Diamond = fromIconsax(Diamonds, "Diamond");
export const DollarSign = fromIconsax(DollarCircle, "DollarSign");
export const Download = fromIconsax(Import, "Download");
export const Dumbbell = fromIconsax(Weight, "Dumbbell");
export const Edit = fromIconsax(IxEdit, "Edit");
export const ExternalLink = fromIconsax(ExportSquare, "ExternalLink");
export const Eye = fromIconsax(IxEye, "Eye");
export const EyeOff = fromIconsax(EyeSlash, "EyeOff");
export const Facebook = fromIconsax(IxFacebook, "Facebook");
export const Factory = fromIconsax(Buildings2, "Factory");
export const FileUp = fromIconsax(DocumentUpload, "FileUp");
export const Filter = fromIconsax(IxFilter, "Filter");
export const Flame = fromIconsax(Flash, "Flame");
export const Gamepad2 = fromIconsax(Game, "Gamepad2");
export const Globe = fromIconsax(Global, "Globe");
export const GraduationCap = fromIconsax(Teacher, "GraduationCap");
export const Hammer = fromIconsax(Ruler, "Hammer");
export const Heart = fromIconsax(IxHeart, "Heart");
export const Home = fromIconsax(Home2, "Home");
export const Hourglass = fromIconsax(Timer1, "Hourglass");
export const ImageIcon = fromIconsax(Gallery, "ImageIcon");
export const Languages = fromIconsax(LanguageSquare, "Languages");
export const LibraryBig = fromIconsax(Book, "LibraryBig");
export const Lightbulb = fromIconsax(LampOn, "Lightbulb");
export const Link = fromIconsax(IxLink, "Link");
export const Link2 = fromIconsax(IxLink2, "Link2");
export const Lock = fromIconsax(IxLock, "Lock");
export const LogOut = fromIconsax(Logout, "LogOut");
export const Mail = fromIconsax(Sms, "Mail");
export const MapPin = fromIconsax(Location, "MapPin");
export const MessageCircle = fromIconsax(Message, "MessageCircle");
export const MessageSquare = fromIconsax(MessageText, "MessageSquare");
export const Mic = fromIconsax(Microphone2, "Mic");
export const Monitor = fromIconsax(IxMonitor, "Monitor");
export const Moon = fromIconsax(IxMoon, "Moon");
export const MoreHorizontal = fromIconsax(More, "MoreHorizontal");
export const Music = fromIconsax(IxMusic, "Music");
export const Network = fromIconsax(Hierarchy, "Network");
export const Palette = fromIconsax(ColorSwatch, "Palette");
export const Paintbrush = fromIconsax(Brush, "Paintbrush");
export const PanelLeft = fromIconsax(SidebarLeft, "PanelLeft");
export const PartyPopper = fromIconsax(Happyemoji, "PartyPopper");
export const Pencil = fromIconsax(Edit2, "Pencil");
export const PencilLine = fromIconsax(IxEdit, "PencilLine");
export const PenTool = fromIconsax(IxPenTool, "PenTool");
export const Phone = fromIconsax(Call, "Phone");
export const PhoneOff = fromIconsax(CallSlash, "PhoneOff");
export const PiggyBank = fromIconsax(Wallet, "PiggyBank");
export const Plane = fromIconsax(Airplane, "Plane");
export const Play = fromIconsax(IxPlay, "Play");
export const Plus = fromIconsax(Add, "Plus");
export const PlusCircle = fromIconsax(AddCircle, "PlusCircle");
export const RefreshCw = fromIconsax(Refresh, "RefreshCw");
export const Rocket = fromIconsax(StatusUp, "Rocket");
export const RotateCcw = fromIconsax(RotateLeft, "RotateCcw");
export const Scale = fromIconsax(Judge, "Scale");
export const Search = fromIconsax(SearchNormal1, "Search");
export const Settings = fromIconsax(Setting2, "Settings");
export const Shield = fromIconsax(IxShield, "Shield");
export const Ship = fromIconsax(IxShip, "Ship");
export const ShoppingCart = fromIconsax(IxShoppingCart, "ShoppingCart");
export const SlidersHorizontal = fromIconsax(Setting4, "SlidersHorizontal");
export const Smartphone = fromIconsax(Mobile, "Smartphone");
export const Smile = fromIconsax(EmojiHappy, "Smile");
export const Sparkles = fromIconsax(MagicStar, "Sparkles");
export const SquarePen = fromIconsax(IxEdit, "SquarePen");
export const Star = fromIconsax(Star1, "Star");
export const Stethoscope = fromIconsax(Health, "Stethoscope");
export const Tag = fromIconsax(IxTag, "Tag");
export const Target = fromIconsax(Radar, "Target");
export const ThumbsUp = fromIconsax(Like1, "ThumbsUp");
export const Trash2 = fromIconsax(Trash, "Trash2");
export const TrendingUp = fromIconsax(TrendUp, "TrendingUp");
export const Trophy = fromIconsax(Cup, "Trophy");
export const Truck = fromIconsax(IxTruck, "Truck");
export const Type = fromIconsax(Text, "Type");
export const Upload = fromIconsax(Export, "Upload");
export const UploadCloud = fromIconsax(DocumentUpload, "UploadCloud");
export const User = fromIconsax(IxUser, "User");
export const UserPlus = fromIconsax(UserAdd, "UserPlus");
export const UserRound = fromIconsax(IxUser, "UserRound");
export const Users = fromIconsax(People, "Users");
export const Utensils = fromIconsax(Reserve, "Utensils");
export const UtensilsCrossed = fromIconsax(Reserve, "UtensilsCrossed");
export const Video = fromIconsax(IxVideo, "Video");
export const Volume2 = fromIconsax(VolumeHigh, "Volume2");
export const VolumeX = fromIconsax(VolumeSlash, "VolumeX");
export const XCircle = fromIconsax(CloseCircle, "XCircle");
export const Zap = fromIconsax(Flash, "Zap");
