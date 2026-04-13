
-- Insert missing files from "IAM Files" into files_repository for folders that are empty
-- Map columns: File Name -> file_name, Folder Name -> folder_name, Description -> description,
-- Drive Link Download -> drive_link_download, Drive Link share -> drive_link_share,
-- Images -> images, View Video URL -> view_video_url, Price (SRP) -> price_srp,
-- Price (DP) -> price_dp, Check Match -> check_match, Give Me 5 -> give_me_5,
-- Just 4 You -> just_4_you, Infinity -> infinity, Package Points (SMC) -> package_points_smc,
-- Unilevel Points -> unilevel_points, RQV -> rqv, Wholesale Package Commission -> wholesale_package_commission

INSERT INTO files_repository (
  id, file_name, folder_name, description,
  drive_link_download, drive_link_share, images, view_video_url,
  price_srp, price_dp, check_match, give_me_5,
  just_4_you, infinity, package_points_smc, unilevel_points,
  rqv, wholesale_package_commission, is_active
)
SELECT
  i.id,
  i."File Name",
  i."Folder Name",
  i."Description",
  i."Drive Link Download",
  i."Drive Link share",
  i."Images",
  i."View Video URL",
  i."Price (SRP)",
  i."Price (DP)",
  i."Check Match",
  i."Give Me 5",
  i."Just 4 You",
  i."Infinity",
  i."Package Points (SMC)",
  i."Unilevel Points",
  i."RQV",
  i."Wholesale Package Commission",
  true
FROM "IAM Files" i
WHERE i."Folder Name" IN ('2025 Q4 Incentive', 'FDA Documentations', 'Files', 'How to Rank-Up', 'Memos and Processes')
  AND i."File Name" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM files_repository fr WHERE fr.id = i.id
  );
