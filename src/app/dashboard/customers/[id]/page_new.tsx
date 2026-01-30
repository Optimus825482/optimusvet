"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  PawPrint,
  Receipt,
  Edit,
  Upload,
  Loader2,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";