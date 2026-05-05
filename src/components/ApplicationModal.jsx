// ApplicationModal.jsx
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Upload, AlertCircle, Loader2 } from "lucide-react";

const EMPTY_FORM = {
  // Step 1 - Personal Information
  fullName: "",
  dateOfBirth: "",
  contactNumber: "",
  email: "",
  currentAddress: "",

  // Step 2 - Employment & Financial Info
  employmentStatus: "",
  jobTitle: "",
  companyName: "",
  monthlyIncome: "",
  lengthOfEmployment: "",
  workAddress: "",

  // Step 3 - Rental History
  firstTimeRenter: "",
  previousAddress: "",
  rentalDuration: "",
  reasonForLeaving: "",
  landlordName: "",
  landlordPhone: "",
  landlordEmail: "",

  // Step 4 - Identity Verification
  validIdFront: null,
  validIdBack: null,
  proofOfIncome: null,

  // Step 5 - Declaration & Consent
  consentIdentity: false,
  consentDataPrivacy: false,
};

export default function ApplicationModal({ isOpen, onClose, unitTitle, unitPrice, onSubmit, submitting = false, submitError = null }) {
  const [step, setStep] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Reset internal state every time the modal is reopened so a previous
  // submission's values / step / errors don't leak into a new attempt.
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setShowConfirmModal(false);
      setFormData(EMPTY_FORM);
      setErrors({});
    }
  }, [isOpen]);

  const handleClose = () => {
    setStep(1);
    setShowConfirmModal(false);
    setFormData(EMPTY_FORM);
    setErrors({});
    onClose?.();
  };

  if (!isOpen) return null;

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.contactNumber.trim()) newErrors.contactNumber = "Contact number is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      if (!formData.currentAddress.trim()) newErrors.currentAddress = "Current address is required";
    }
    
    if (step === 2) {
      if (!formData.employmentStatus) newErrors.employmentStatus = "Employment status is required";
      if (formData.employmentStatus !== "Unemployed" && formData.employmentStatus !== "Student" && formData.employmentStatus !== "Retired") {
        if (!formData.jobTitle.trim()) newErrors.jobTitle = "Job title is required";
        if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
        if (!formData.monthlyIncome) newErrors.monthlyIncome = "Monthly income is required";
        if (!formData.lengthOfEmployment) newErrors.lengthOfEmployment = "Length of employment is required";
        if (!formData.workAddress.trim()) newErrors.workAddress = "Work address is required";
      }
    }
    
    if (step === 3) {
      if (!formData.firstTimeRenter) newErrors.firstTimeRenter = "Please select an option";
      if (formData.firstTimeRenter === "No") {
        if (!formData.previousAddress.trim()) newErrors.previousAddress = "Previous address is required";
        if (!formData.rentalDuration) newErrors.rentalDuration = "Rental duration is required";
        if (!formData.reasonForLeaving.trim()) newErrors.reasonForLeaving = "Reason for leaving is required";
        if (!formData.landlordName.trim()) newErrors.landlordName = "Landlord name is required";
        if (!formData.landlordPhone.trim()) newErrors.landlordPhone = "Landlord phone is required";
        if (!formData.landlordEmail.trim()) newErrors.landlordEmail = "Landlord email is required";
      }
    }
    
    if (step === 4) {
      if (!formData.validIdFront) newErrors.validIdFront = "Front of valid ID is required";
      if (!formData.validIdBack) newErrors.validIdBack = "Back of valid ID is required";
      if (!formData.proofOfIncome) newErrors.proofOfIncome = "Proof of income is required";
    }
    
    if (step === 5) {
      if (!formData.consentIdentity) newErrors.consentIdentity = "You must consent to identity verification";
      if (!formData.consentDataPrivacy) newErrors.consentDataPrivacy = "You must agree to the data privacy agreement";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmitClick = () => {
    if (validateStep()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    onSubmit(formData);
    // The parent flips isOpen back to false after a successful submit;
    // the isOpen effect above takes care of clearing local state for
    // the next time the modal is opened.
  };

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      updateFormData(field, file);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {[1, 2, 3, 4, 5].map((num) => (
        <div key={num} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
              ${step >= num 
                ? "bg-gradient-to-r from-[#e8756a] to-[#f0a090] text-white shadow-md" 
                : "bg-gray-200 text-gray-500"}`}
          >
            {step > num ? <Check size={18} /> : num}
          </div>
          {num < 5 && (
            <div className={`w-12 h-0.5 mx-2 ${step > num ? "bg-[#e8756a]" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Personal Information</h2>
            <p className="text-sm text-gray-500 mb-6">Step 1 of 5</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateFormData("fullName", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.fullName ? "border-red-500" : "border-gray-300"}`}
                  placeholder="Juan Dela Cruz"
                />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateFormData("dateOfBirth", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.dateOfBirth ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => updateFormData("contactNumber", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.contactNumber ? "border-red-500" : "border-gray-300"}`}
                  placeholder="+63 912 345 6789"
                />
                {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.email ? "border-red-500" : "border-gray-300"}`}
                  placeholder="juan@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Address</label>
                <textarea
                  value={formData.currentAddress}
                  onChange={(e) => updateFormData("currentAddress", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.currentAddress ? "border-red-500" : "border-gray-300"}`}
                  rows="2"
                  placeholder="Your current residential address"
                />
                {errors.currentAddress && <p className="text-red-500 text-xs mt-1">{errors.currentAddress}</p>}
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Employment & Financial Info</h2>
            <p className="text-sm text-gray-500 mb-6">Step 2 of 5</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => updateFormData("employmentStatus", e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.employmentStatus ? "border-red-500" : "border-gray-300"}`}
                >
                  <option value="">Select employment status</option>
                  <option value="Employed">Employed</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Student">Student</option>
                  <option value="Unemployed">Unemployed</option>
                  <option value="Retired">Retired</option>
                </select>
                {errors.employmentStatus && <p className="text-red-500 text-xs mt-1">{errors.employmentStatus}</p>}
              </div>
              
              {formData.employmentStatus && formData.employmentStatus !== "Unemployed" && formData.employmentStatus !== "Student" && formData.employmentStatus !== "Retired" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => updateFormData("jobTitle", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.jobTitle ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Software Engineer"
                    />
                    {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateFormData("companyName", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.companyName ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Company Inc."
                    />
                    {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income (₱)</label>
                    <input
                      type="number"
                      value={formData.monthlyIncome}
                      onChange={(e) => updateFormData("monthlyIncome", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.monthlyIncome ? "border-red-500" : "border-gray-300"}`}
                      placeholder="50000"
                    />
                    {errors.monthlyIncome && <p className="text-red-500 text-xs mt-1">{errors.monthlyIncome}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Length of Employment</label>
                    <select
                      value={formData.lengthOfEmployment}
                      onChange={(e) => updateFormData("lengthOfEmployment", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.lengthOfEmployment ? "border-red-500" : "border-gray-300"}`}
                    >
                      <option value="">Select duration</option>
                      <option value="Less than 6 months">Less than 6 months</option>
                      <option value="6 months - 1 year">6 months - 1 year</option>
                      <option value="1 - 2 years">1 - 2 years</option>
                      <option value="2 - 5 years">2 - 5 years</option>
                      <option value="5+ years">5+ years</option>
                    </select>
                    {errors.lengthOfEmployment && <p className="text-red-500 text-xs mt-1">{errors.lengthOfEmployment}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Address</label>
                    <textarea
                      value={formData.workAddress}
                      onChange={(e) => updateFormData("workAddress", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.workAddress ? "border-red-500" : "border-gray-300"}`}
                      rows="2"
                      placeholder="Your work address"
                    />
                    {errors.workAddress && <p className="text-red-500 text-xs mt-1">{errors.workAddress}</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Rental History</h2>
            <p className="text-sm text-gray-500 mb-6">Step 3 of 5</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First-time renter?</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => updateFormData("firstTimeRenter", "Yes")}
                    className={`px-6 py-2 rounded-lg font-medium transition ${
                      formData.firstTimeRenter === "Yes" 
                        ? "bg-[#e8756a] text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData("firstTimeRenter", "No")}
                    className={`px-6 py-2 rounded-lg font-medium transition ${
                      formData.firstTimeRenter === "No" 
                        ? "bg-[#e8756a] text-white" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    No
                  </button>
                </div>
                {errors.firstTimeRenter && <p className="text-red-500 text-xs mt-1">{errors.firstTimeRenter}</p>}
              </div>
              
              {formData.firstTimeRenter === "No" && (
                <div className="space-y-4 border-t pt-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Address</label>
                    <input
                      type="text"
                      value={formData.previousAddress}
                      onChange={(e) => updateFormData("previousAddress", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.previousAddress ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Your previous rental address"
                    />
                    {errors.previousAddress && <p className="text-red-500 text-xs mt-1">{errors.previousAddress}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rental Duration</label>
                    <input
                      type="text"
                      value={formData.rentalDuration}
                      onChange={(e) => updateFormData("rentalDuration", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.rentalDuration ? "border-red-500" : "border-gray-300"}`}
                      placeholder="e.g., 2 years"
                    />
                    {errors.rentalDuration && <p className="text-red-500 text-xs mt-1">{errors.rentalDuration}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                    <input
                      type="text"
                      value={formData.reasonForLeaving}
                      onChange={(e) => updateFormData("reasonForLeaving", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.reasonForLeaving ? "border-red-500" : "border-gray-300"}`}
                      placeholder="e.g., Lease ended, Relocation"
                    />
                    {errors.reasonForLeaving && <p className="text-red-500 text-xs mt-1">{errors.reasonForLeaving}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Landlord Name</label>
                    <input
                      type="text"
                      value={formData.landlordName}
                      onChange={(e) => updateFormData("landlordName", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.landlordName ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Previous landlord's name"
                    />
                    {errors.landlordName && <p className="text-red-500 text-xs mt-1">{errors.landlordName}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Landlord Phone</label>
                    <input
                      type="tel"
                      value={formData.landlordPhone}
                      onChange={(e) => updateFormData("landlordPhone", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.landlordPhone ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Contact number"
                    />
                    {errors.landlordPhone && <p className="text-red-500 text-xs mt-1">{errors.landlordPhone}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Landlord Email</label>
                    <input
                      type="email"
                      value={formData.landlordEmail}
                      onChange={(e) => updateFormData("landlordEmail", e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8756a] ${errors.landlordEmail ? "border-red-500" : "border-gray-300"}`}
                      placeholder="Landlord's email"
                    />
                    {errors.landlordEmail && <p className="text-red-500 text-xs mt-1">{errors.landlordEmail}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      case 4:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Identity Verification</h2>
            <p className="text-sm text-gray-500 mb-6">Step 4 of 5</p>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Government ID (Front)</label>
                <div className="mt-1 flex items-center gap-3">
                  <label className={`flex-1 flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition ${errors.validIdFront ? "border-red-500" : "border-gray-300"}`}>
                    <span className="text-sm text-gray-600">{formData.validIdFront ? formData.validIdFront.name : "Choose File"}</span>
                    <Upload size={18} className="text-gray-400" />
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange("validIdFront", e)} />
                  </label>
                </div>
                {errors.validIdFront && <p className="text-red-500 text-xs mt-1">{errors.validIdFront}</p>}
                <p className="text-xs text-gray-400 mt-1">Accepted: JPG, PNG, PDF (Max 5MB)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Government ID (Back)</label>
                <div className="mt-1 flex items-center gap-3">
                  <label className={`flex-1 flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition ${errors.validIdBack ? "border-red-500" : "border-gray-300"}`}>
                    <span className="text-sm text-gray-600">{formData.validIdBack ? formData.validIdBack.name : "Choose File"}</span>
                    <Upload size={18} className="text-gray-400" />
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange("validIdBack", e)} />
                  </label>
                </div>
                {errors.validIdBack && <p className="text-red-500 text-xs mt-1">{errors.validIdBack}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Income (Certificate of Employment)</label>
                <div className="mt-1 flex items-center gap-3">
                  <label className={`flex-1 flex items-center justify-between px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition ${errors.proofOfIncome ? "border-red-500" : "border-gray-300"}`}>
                    <span className="text-sm text-gray-600">{formData.proofOfIncome ? formData.proofOfIncome.name : "Choose File"}</span>
                    <Upload size={18} className="text-gray-400" />
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileChange("proofOfIncome", e)} />
                  </label>
                </div>
                {errors.proofOfIncome && <p className="text-red-500 text-xs mt-1">{errors.proofOfIncome}</p>}
                <p className="text-xs text-gray-400 mt-1">COE, Payslip, or Bank Statement</p>
              </div>
            </div>
          </div>
        );
        
      case 5:
        return (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Declaration & Consent</h2>
            <p className="text-sm text-gray-500 mb-6">Step 5 of 5</p>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentIdentity}
                  onChange={(e) => updateFormData("consentIdentity", e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#e8756a] rounded focus:ring-[#e8756a]"
                />
                <span className="text-sm text-gray-700">I consent to identity verification</span>
              </label>
              {errors.consentIdentity && <p className="text-red-500 text-xs mt-1 ml-7">{errors.consentIdentity}</p>}
              
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentDataPrivacy}
                  onChange={(e) => updateFormData("consentDataPrivacy", e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#e8756a] rounded focus:ring-[#e8756a]"
                />
                <span className="text-sm text-gray-700">I agree to the data privacy agreement</span>
              </label>
              {errors.consentDataPrivacy && <p className="text-red-500 text-xs mt-1 ml-7">{errors.consentDataPrivacy}</p>}
              
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <p className="text-xs text-gray-500">
                  By submitting this application, you confirm that all information provided is accurate and complete. 
                  ViewxRent may verify the information provided with third parties.
                </p>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Modal - with blur backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 py-8">
          {/* Backdrop with blur effect - shows the underlying content */}
          <div
            className="fixed inset-0 backdrop-blur-md bg-white/30 transition-all"
            onClick={handleClose}
          />
          
          {/* Modal Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#e8756a] to-[#f0a090]">
              <div>
                <h3 className="text-lg font-semibold text-white">Apply for Rental</h3>
                <p className="text-sm text-white text-opacity-90">{unitTitle}</p>
              </div>
              <button onClick={handleClose} className="text-white hover:text-gray-200 transition">
                <X size={24} />
              </button>
            </div>
            
            {/* Price Summary — unitPrice may be null if the listing has no
                monthly_rent; coerce to a string and parse defensively so the
                modal renders instead of throwing TypeError on .replace(). */}
            {(() => {
              const priceStr = unitPrice == null ? "" : String(unitPrice);
              const priceNum = Number((priceStr.match(/[0-9]+/g) ?? []).join("")) || 0;
              const display = priceStr.trim() || "Price not set";
              const initial = priceNum > 0 ? `₱${(priceNum * 2).toLocaleString()}` : "—";
              return (
                <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monthly Rent:</span>
                    <span className="font-semibold text-[#e8756a]">
                      {priceNum > 0 ? `${display}/month` : display}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Security Deposit:</span>
                    <span className="font-semibold text-gray-700">{display}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-1 border-t border-orange-200">
                    <span className="text-sm font-medium text-gray-700">Initial Payment:</span>
                    <span className="font-bold text-[#e8756a]">{initial}</span>
                  </div>
                </div>
              );
            })()}
            
            {/* Content */}
            <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
              <StepIndicator />
              {renderStep()}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between bg-gray-50">
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition flex items-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Back
                </button>
              ) : (
                <div></div>
              )}
              
              {step < 5 ? (
                <button
                  onClick={handleNext}
                  className="px-5 py-2 bg-gradient-to-r from-[#e8756a] to-[#f0a090] text-white rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2 shadow-md"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmitClick}
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-[#e8756a] to-[#f0a090] text-white rounded-lg font-medium hover:opacity-90 transition shadow-md disabled:opacity-60 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Submit Application
                </button>
              )}
              {submitError && (
                <p className="text-red-500 text-xs mt-2 text-center">{submitError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal - with blur backdrop too */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div 
              className="fixed inset-0 backdrop-blur-md bg-white/30" 
              onClick={() => setShowConfirmModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto p-6 animate-fade-in-up">
              <div className="text-center">
                <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-[#e8756a]" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Are you sure?</h3>
                <p className="text-gray-500 mb-6">Are you sure you want to submit this application?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[#e8756a] to-[#f0a090] text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    Yes, Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add animation styles - add this to your global CSS or index.css */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}